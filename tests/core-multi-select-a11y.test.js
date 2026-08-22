import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-multi-select/core-multi-select.js';

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
 * @returns {Promise<void>}
 */
function nextTask() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function mountMultiSelect(attributes = '') {
    const searchable = attributes.includes('searchable=') ? '' : 'searchable="false"';
    document.body.innerHTML = `
        <core-multi-select
            label="Choices"
            ${searchable}
            floating="false"
            options='[
                {"value":"a","label":"Alpha","selected":true},
                {"value":"b","label":"Bravo","disabled":true},
                {"value":"c","label":"Charlie"}
            ]'
            ${attributes}
        ></core-multi-select>
    `;
    return document.body.firstElementChild;
}

test('core-multi-select uses one listbox focus model and exposes selection state', async () => {
    const component = mountMultiSelect();
    component.open();
    await nextTask();

    let list = component.querySelector('[role="listbox"]');
    let options = list.querySelectorAll('[role="option"]');
    assert.equal(list.getAttribute('aria-activedescendant'), options[0].id);
    assert.deepEqual(
        Array.from(options, (option) => option.getAttribute('aria-selected')),
        ['true', 'false', 'false']
    );
    assert.equal(options[1].getAttribute('aria-disabled'), 'true');
    options.forEach((option) => {
        const checkbox = option.querySelector('input[type="checkbox"]');
        assert.equal(checkbox.getAttribute('tabindex'), '-1');
        assert.equal(checkbox.getAttribute('aria-hidden'), 'true');
    });

    press(list, 'ArrowDown');
    assert.equal(list.getAttribute('aria-activedescendant'), options[2].id);

    press(list, 'Home');
    assert.equal(list.getAttribute('aria-activedescendant'), options[0].id);
    press(list, 'End');
    assert.equal(list.getAttribute('aria-activedescendant'), options[2].id);

    press(list, ' ');
    list = component.querySelector('[role="listbox"]');
    options = list.querySelectorAll('[role="option"]');
    assert.equal(options[2].getAttribute('aria-selected'), 'true');
    assert.deepEqual(component.getSelectedValues(), ['a', 'c']);

    press(list, 'Enter');
    list = component.querySelector('[role="listbox"]');
    options = list.querySelectorAll('[role="option"]');
    assert.equal(options[2].getAttribute('aria-selected'), 'false');
    assert.deepEqual(component.getSelectedValues(), ['a']);
});

test('core-multi-select clears active option on Escape and restores it when reopened', async () => {
    const component = mountMultiSelect();
    component.open();
    await nextTask();
    let list = component.querySelector('[role="listbox"]');

    press(list, 'Escape');
    list = component.querySelector('[role="listbox"]');
    assert.equal(component.querySelector('.core-multi-select__trigger').getAttribute('aria-expanded'), 'false');
    assert.equal(list.hasAttribute('aria-activedescendant'), false);

    component.open();
    await nextTask();
    list = component.querySelector('[role="listbox"]');
    assert.equal(
        list.getAttribute('aria-activedescendant'),
        list.querySelector('[role="option"]').id
    );
});

test('core-multi-select search hands ArrowDown navigation to the listbox', async () => {
    const component = mountMultiSelect('searchable="true"');
    component.open();
    await nextTask();
    const search = component.querySelector('.core-multi-select__search');
    const list = component.querySelector('[role="listbox"]');

    press(search, 'ArrowDown');
    assert.equal(
        list.getAttribute('aria-activedescendant'),
        list.querySelector('[role="option"]').id
    );
});
