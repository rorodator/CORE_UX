import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-autocomplete/core-autocomplete.js';

function wait() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function mountAutocomplete(minCharacters = 1) {
    document.body.innerHTML = '<core-autocomplete floating="false"></core-autocomplete>';
    const component = document.body.firstElementChild;
    component.configure({ delay: 0, minCharacters });
    return component;
}

function enterQuery(component, query) {
    const input = component.querySelector('[role="combobox"]');
    input.value = query;
    input.dispatchEvent(new Event('input'));
    return input;
}

function visibleChoices(component) {
    return Array.from(
        component.querySelectorAll('.core-autocomplete__option-title'),
        (option) => option.textContent
    );
}

test('core-autocomplete ignores an older Promise response resolved last', async () => {
    const component = mountAutocomplete();
    const pending = new Map();
    component.setDataSource((query) => new Promise((resolve) => pending.set(query, resolve)));

    const input = enterQuery(component, 'abcd');
    await wait();
    enterQuery(component, 'a');
    await wait();

    pending.get('a')(['Current choice']);
    await wait();
    pending.get('abcd')(['Stale choice']);
    await wait();

    assert.equal(input.value, 'a');
    assert.deepEqual(visibleChoices(component), ['Current choice']);
});

test('core-autocomplete hides previous choices as soon as the query changes', async () => {
    const component = mountAutocomplete();
    const pending = new Map();
    component.setDataSource((query) => new Promise((resolve) => pending.set(query, resolve)));

    const input = enterQuery(component, 'abcd');
    await wait();
    pending.get('abcd')(['Choice for abcd']);
    await wait();
    assert.deepEqual(visibleChoices(component), ['Choice for abcd']);

    enterQuery(component, 'abc');

    assert.equal(input.value, 'abc');
    assert.deepEqual(visibleChoices(component), []);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
});

test('core-autocomplete unsubscribes and ignores emissions from an older Observable', async () => {
    const component = mountAutocomplete();
    const sources = new Map();
    component.setDataSource((query) => ({
        subscribe(observer) {
            const source = {
                observer,
                unsubscribed: false
            };
            sources.set(query, source);
            return {
                unsubscribe() {
                    source.unsubscribed = true;
                }
            };
        }
    }));

    enterQuery(component, 'abcd');
    await wait();
    enterQuery(component, 'a');
    await wait();

    assert.equal(sources.get('abcd').unsubscribed, true);
    sources.get('a').observer.next(['Current choice']);
    sources.get('abcd').observer.next(['Stale choice']);

    assert.deepEqual(visibleChoices(component), ['Current choice']);
});

test('core-autocomplete clears immediately below min-characters and rejects pending results', async () => {
    const component = mountAutocomplete(2);
    const pending = new Map();
    component.setDataSource((query) => new Promise((resolve) => pending.set(query, resolve)));

    const input = enterQuery(component, 'abcd');
    await wait();
    assert.equal(component.classList.contains('core-autocomplete--loading'), true);

    enterQuery(component, 'a');

    assert.equal(input.value, 'a');
    assert.deepEqual(visibleChoices(component), []);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(component.classList.contains('core-autocomplete--loading'), false);
    assert.equal(pending.has('a'), false);

    pending.get('abcd')(['Stale choice']);
    await wait();

    assert.deepEqual(visibleChoices(component), []);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
});
