import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-autocomplete/core-autocomplete.js';

/**
 * @param {Element} target
 * @param {string} key
 */
function press(target, key) {
    const event = new Event('keydown', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'key', { value: key });
    target.dispatchEvent(event);
}

/**
 * @param {number} duration
 * @returns {Promise<void>}
 */
function wait(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
}

function mountAutocomplete(attributes = '') {
    document.body.innerHTML = `<core-autocomplete floating="false" ${attributes}></core-autocomplete>`;
    return document.body.firstElementChild;
}

/**
 * @param {Element} component
 * @returns {number}
 */
function countSelectedOptions(component) {
    return Array.from(component.querySelectorAll('[role="option"]'))
        .filter((option) => option.getAttribute('aria-selected') === 'true')
        .length;
}

/**
 * @param {Element} input
 * @returns {Element|null}
 */
function activeDescendantElement(input) {
    const id = input.getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
}

test('core-autocomplete synchronizes active descendant and option selection with keyboard navigation', () => {
    const component = mountAutocomplete();
    component.updateResults(['Alpha', 'Bravo', 'Charlie']);

    const input = component.querySelector('[role="combobox"]');
    const options = component.querySelectorAll('[role="option"]');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    assert.equal(input.getAttribute('aria-activedescendant'), options[0].id);
    assert.deepEqual(
        Array.from(options, (option) => option.getAttribute('aria-selected')),
        ['true', 'false', 'false']
    );

    press(input, 'End');
    assert.equal(input.getAttribute('aria-activedescendant'), options[2].id);
    assert.equal(options[2].getAttribute('aria-selected'), 'true');

    press(input, 'Home');
    press(input, 'ArrowDown');
    assert.equal(input.getAttribute('aria-activedescendant'), options[1].id);
    assert.equal(options[0].getAttribute('aria-selected'), 'false');
    assert.equal(options[1].getAttribute('aria-selected'), 'true');

    const stableIds = Array.from(options, (option) => option.id);
    component.updateResults(['Alpha', 'Bravo', 'Charlie']);
    assert.deepEqual(
        Array.from(component.querySelectorAll('[role="option"]'), (option) => option.id),
        stableIds
    );
});

test('core-autocomplete clears and restores active descendant across Escape, reopening, and Enter', () => {
    const component = mountAutocomplete();
    component.updateResults(['Alpha', 'Bravo']);
    const input = component.querySelector('[role="combobox"]');

    press(input, 'Escape');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.hasAttribute('aria-activedescendant'), false);
    assert.deepEqual(
        Array.from(component.querySelectorAll('[role="option"]'), (option) => option.getAttribute('aria-selected')),
        ['false', 'false']
    );

    press(input, 'ArrowUp');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    assert.equal(
        input.getAttribute('aria-activedescendant'),
        component.querySelectorAll('[role="option"]')[1].id
    );

    press(input, 'Enter');
    assert.equal(input.value, 'Bravo');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.hasAttribute('aria-activedescendant'), false);
});

test('core-autocomplete blur closes the popup and forceSelection restores the committed value', async () => {
    const component = mountAutocomplete('force-selection="true"');
    component.setValue('Alpha');
    component.updateResults(['Alpha', 'Bravo']);
    const input = component.querySelector('[role="combobox"]');
    input.value = 'Uncommitted';

    input.dispatchEvent(new Event('blur'));
    await wait(170);

    assert.equal(input.value, 'Alpha');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.hasAttribute('aria-activedescendant'), false);
});

test('core-autocomplete ArrowDown while closed opens popup and activates the first option', () => {
    const component = mountAutocomplete();
    component.updateResults(['Alpha', 'Bravo', 'Charlie']);
    const input = component.querySelector('[role="combobox"]');

    press(input, 'Escape');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.hasAttribute('aria-activedescendant'), false);

    press(input, 'ArrowDown');
    assert.equal(input.getAttribute('aria-expanded'), 'true');

    const options = component.querySelectorAll('[role="option"]');
    assert.equal(input.getAttribute('aria-activedescendant'), options[0].id);
    assert.equal(countSelectedOptions(component), 1);
    assert.equal(options[0].getAttribute('aria-selected'), 'true');
    assert.equal(options[1].getAttribute('aria-selected'), 'false');
    assert.equal(options[2].getAttribute('aria-selected'), 'false');
});

test('core-autocomplete clears active descendant when results become empty', () => {
    const component = mountAutocomplete();
    component.updateResults(['Alpha', 'Bravo']);
    const input = component.querySelector('[role="combobox"]');
    const previousActiveId = input.getAttribute('aria-activedescendant');
    assert.ok(previousActiveId);

    component.updateResults([]);

    assert.equal(input.hasAttribute('aria-activedescendant'), false);
    assert.equal(document.getElementById(previousActiveId), null);
    assert.equal(component.querySelectorAll('[role="option"]').length, 0);
});

test('core-autocomplete keeps active descendant on a new option after results replacement', () => {
    const component = mountAutocomplete();
    component.updateResults(['Alpha', 'Bravo', 'Charlie']);
    const input = component.querySelector('[role="combobox"]');

    press(input, 'ArrowDown');
    component.updateResults(['Delta', 'Echo']);

    const options = component.querySelectorAll('[role="option"]');
    const active = activeDescendantElement(input);
    assert.ok(active);
    assert.ok(Array.from(options).includes(active));
    assert.equal(input.getAttribute('aria-activedescendant'), options[0].id);
    assert.equal(countSelectedOptions(component), 1);
    assert.equal(options[0].getAttribute('aria-selected'), 'true');
    assert.equal(options[1].getAttribute('aria-selected'), 'false');
});
