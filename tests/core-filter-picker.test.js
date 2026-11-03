import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import '../components/core-menu/core-menu.js';
import '../components/core-filter-picker/core-filter-picker.js';

const source = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../components/core-filter-picker/core-filter-picker.js'),
    'utf8'
);

let focusedElement = null;
Object.defineProperty(document, 'activeElement', {
    configurable: true,
    get: () => focusedElement,
});
HTMLElement.prototype.focus = function focus() {
    focusedElement = this;
};

/**
 * @param {string} type
 * @param {Record<string, unknown>} [properties]
 * @returns {Event}
 */
function createEvent(type, properties = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.entries(properties).forEach(([name, value]) => {
        Object.defineProperty(event, name, { value });
    });
    return event;
}

/**
 * @param {Element} target
 * @param {string} key
 * @returns {Event}
 */
function press(target, key) {
    const event = createEvent('keydown', { key });
    target.dispatchEvent(event);
    return event;
}

/**
 * @param {string} [html]
 * @returns {HTMLElement}
 */
function clearBody() {
    document.querySelectorAll('core-filter-picker, core-menu').forEach((el) => {
        if (el.open && typeof el.closeMenu === 'function') {
            el.closeMenu();
        }
    });
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
}

/**
 * @param {string} [html]
 * @returns {HTMLElement}
 */
function mount(html = '<core-filter-picker id="picker"></core-filter-picker>') {
    focusedElement = null;
    clearBody();
    document.body.innerHTML = html;
    return document.getElementById('picker');
}

/**
 * @returns {object[]}
 */
function catalog() {
    return [
        {
            id: 'amount',
            label: 'Amount',
            description: 'Notional',
            keywords: ['notional'],
            group: 'Trading / Amounts',
            operators: ['eq'],
        },
        {
            id: 'tradeDate',
            label: 'Trade date',
            keywords: ['échéance'],
            groupPath: ['Trading', 'Dates'],
        },
        { id: 'name', label: 'Name' },
        { id: 'status', label: 'Status', groupPath: ['Trading', 'Dates'], disabled: true },
        { id: 'hidden', label: 'Hidden', visible: false, groupPath: ['Trading'] },
        { id: 'amount', label: 'Duplicate' },
    ];
}

/**
 * @param {HTMLElement} picker
 * @returns {HTMLInputElement}
 */
function inputOf(picker) {
    return picker.querySelector('[data-core-filter-picker-input]');
}

/**
 * @param {HTMLElement} picker
 * @returns {HTMLElement}
 */
function panelOf(picker) {
    return document.getElementById(picker.panelId);
}

/**
 * @param {HTMLElement} picker
 * @returns {string[]}
 */
function optionIds(picker) {
    return Array.from(panelOf(picker).querySelectorAll('[role="treeitem"]')).map((item) => item.getAttribute('data-entry-id'));
}

/**
 * @param {HTMLElement} picker
 * @returns {string[]}
 */
function groupLabels(picker) {
    return Array.from(panelOf(picker).querySelectorAll('.core-filter-picker__group')).map((item) => item.textContent);
}

/**
 * @param {HTMLElement} picker
 * @param {string} value
 */
function typeQuery(picker, value) {
    const input = inputOf(picker);
    input.value = value;
    input.dispatchEvent(createEvent('input'));
}

test('the picker does not import the engine or a data source', () => {
    assert.equal(source.includes('Core_FilterEngine'), false);
    assert.equal(source.includes('core-filter-engine'), false);
    assert.equal(source.includes('DataSource'), false);
    assert.equal(source.includes('OPEN_MENU_BY_DOCUMENT'), false);
});

test('the field is visible and the tree stays closed until asked', () => {
    const picker = mount();
    picker.setEntries(catalog());
    const input = inputOf(picker);
    assert.equal(input.getAttribute('type'), 'text');
    assert.equal(input.getAttribute('role'), 'combobox');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.equal(input.getAttribute('aria-haspopup'), 'tree');
    assert.equal(picker.querySelector('label').textContent, 'Add a filter');
    assert.equal(picker.querySelector('[data-core-filter-picker-browse]').textContent.includes('Browse'), true);
    assert.equal(panelOf(picker).hasAttribute('hidden'), true);
    assert.deepEqual(picker.getEntries().map((entry) => entry.id), ['amount', 'tradeDate', 'name', 'status']);
    assert.deepEqual(picker.getEntries()[0].groupPath, ['Trading', 'Amounts']);
});

test('typing filters accents, keywords, and categories without dropping the path', () => {
    const picker = mount();
    picker.setEntries(catalog());
    typeQuery(picker, 'echeance');
    assert.equal(picker.open, true);
    assert.equal(panelOf(picker).hasAttribute('hidden'), false);
    assert.deepEqual(optionIds(picker), ['tradeDate']);
    assert.deepEqual(groupLabels(picker), ['Trading', 'Dates']);
    assert.equal(inputOf(picker).getAttribute('aria-activedescendant'), panelOf(picker).querySelector('[data-entry-id="tradeDate"]').id);

    typeQuery(picker, 'NOTIONAL');
    assert.deepEqual(optionIds(picker), ['amount']);
    assert.deepEqual(groupLabels(picker), ['Trading', 'Amounts']);
    assert.equal(panelOf(picker).querySelector('.core-filter-picker__option-desc').textContent, 'Notional');

    typeQuery(picker, 'dates');
    assert.deepEqual(optionIds(picker), ['tradeDate', 'status']);
    assert.deepEqual(groupLabels(picker), ['Trading', 'Dates']);
    assert.equal(panelOf(picker).querySelector('[data-entry-id="status"]').getAttribute('aria-disabled'), 'true');

    typeQuery(picker, 'trading');
    assert.deepEqual(optionIds(picker), ['amount', 'tradeDate', 'status']);
    assert.equal(optionIds(picker).includes('name'), false);
    assert.equal(optionIds(picker).includes('hidden'), false);
});

test('the browse button opens the full tree or the current filter', () => {
    const picker = mount();
    picker.setEntries(catalog());
    picker.querySelector('[data-core-filter-picker-browse]').dispatchEvent(createEvent('click'));
    assert.equal(picker.open, true);
    assert.deepEqual(optionIds(picker), ['amount', 'tradeDate', 'status', 'name']);
    assert.equal(focusedElement, inputOf(picker));
    picker.querySelector('[data-core-filter-picker-browse]').dispatchEvent(createEvent('click'));
    assert.equal(picker.open, false);

    typeQuery(picker, 'name');
    picker.closeMenu();
    assert.equal(picker.open, false);
    picker.querySelector('[data-core-filter-picker-browse]').dispatchEvent(createEvent('click'));
    assert.deepEqual(optionIds(picker), ['name']);
    assert.equal(groupLabels(picker).length, 0);
});

test('arrows, Enter, Escape, and Tab follow the open tree', () => {
    const picker = mount();
    const chosen = [];
    picker.addEventListener('core-filter-picker-select', (event) => chosen.push(event.detail));
    picker.setEntries(catalog());
    const input = inputOf(picker);
    press(input, 'ArrowDown');
    assert.equal(picker.open, true);
    assert.equal(panelOf(picker).querySelector('.core-filter-picker__option--active').getAttribute('data-entry-id'), 'amount');
    press(input, 'ArrowDown');
    assert.equal(panelOf(picker).querySelector('.core-filter-picker__option--active').getAttribute('data-entry-id'), 'tradeDate');
    press(input, 'End');
    assert.equal(panelOf(picker).querySelector('.core-filter-picker__option--active').getAttribute('data-entry-id'), 'name');
    press(input, 'Home');
    assert.equal(panelOf(picker).querySelector('.core-filter-picker__option--active').getAttribute('data-entry-id'), 'amount');
    const escape = press(input, 'Escape');
    assert.equal(escape.defaultPrevented, true);
    assert.equal(picker.open, false);
    assert.equal(picker.query, '');

    typeQuery(picker, 'trade');
    const enter = press(input, 'Enter');
    assert.equal(enter.defaultPrevented, true);
    assert.equal(picker.open, false);
    assert.equal(picker.query, '');
    assert.equal(input.value, '');
    assert.deepEqual(chosen, [{
        id: 'tradeDate',
        label: 'Trade date',
        description: '',
        keywords: ['échéance'],
        groupPath: ['Trading', 'Dates'],
    }]);

    typeQuery(picker, 'amount');
    const tab = press(input, 'Tab');
    assert.equal(tab.defaultPrevented, false);
    assert.equal(picker.open, false);
    assert.equal(picker.query, 'amount');
});

test('a disabled entry and an empty search stay put', () => {
    const picker = mount();
    const chosen = [];
    picker.addEventListener('core-filter-picker-select', () => chosen.push('selected'));
    picker.setEntries(catalog());
    typeQuery(picker, 'status');
    press(inputOf(picker), 'Enter');
    assert.equal(picker.open, true);
    assert.deepEqual(chosen, []);
    panelOf(picker).querySelector('[data-entry-id="status"]').dispatchEvent(createEvent('click'));
    assert.equal(picker.open, true);
    assert.deepEqual(chosen, []);

    typeQuery(picker, 'zzz');
    assert.equal(panelOf(picker).querySelector('[role="status"]').textContent, 'No matching filters');
    assert.equal(panelOf(picker).querySelector('[role="treeitem"]'), null);
});

test('keep-query retains the field and a later catalog replaces the open tree', () => {
    const picker = mount('<core-filter-picker id="picker" keep-query></core-filter-picker>');
    picker.setEntries(catalog());
    typeQuery(picker, 'name');
    press(inputOf(picker), 'Enter');
    assert.equal(picker.open, false);
    assert.equal(picker.query, 'name');
    picker.openMenu();
    picker.setEntries([
        { id: 'currency', label: 'Currency', group: 'Trading / Reference' },
        { id: 'name', label: 'Name', groupPath: ['Trading', 'Reference'] },
    ]);
    assert.deepEqual(optionIds(picker), ['name']);
    assert.deepEqual(groupLabels(picker), ['Trading', 'Reference']);
    picker.query = '';
    assert.deepEqual(optionIds(picker), ['currency', 'name']);
});

test('an outside click closes the picker without closing another menu', () => {
    const picker = mount(`
        <div>
            <core-filter-picker id="picker"></core-filter-picker>
            <button type="button" id="outside">Outside</button>
        </div>
    `);
    picker.setEntries(catalog());
    picker.openMenu();
    document.getElementById('outside').dispatchEvent(createEvent('click'));
    assert.equal(picker.open, false);

    focusedElement = null;
    clearBody();
    document.body.innerHTML = `
        <core-menu id="menu" label="Operators" open>
            <core-menu-item value="eq" label="Equals"></core-menu-item>
        </core-menu>
        <core-filter-picker id="picker"></core-filter-picker>
    `;
    const menu = document.getElementById('menu');
    const beside = document.getElementById('picker');
    beside.setEntries(catalog());
    beside.openMenu();
    assert.equal(menu.hasAttribute('open'), true);
    assert.equal(beside.open, true);
    assert.equal(document.getElementById('menu-panel').hasAttribute('hidden'), false);
});
