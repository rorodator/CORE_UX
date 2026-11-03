import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CoreFilterBar } from '../components/core-filter-bar/core-filter-bar.js';

if (typeof window.setTimeout !== 'function') {
    window.setTimeout = setTimeout;
}
if (typeof window.clearTimeout !== 'function') {
    window.clearTimeout = clearTimeout;
}

/** @type {Element[]} */
const focused = [];
const nativeFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function focus(...args) {
    focused.push(this);
    nativeFocus.apply(this, args);
};

function clearBody() {
    document.querySelectorAll('core-filter-bar, core-filter-picker, core-menu').forEach((node) => {
        node.closeMenu?.();
        node.destroy?.();
    });
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    focused.length = 0;
}

/**
 * @returns {CoreFilterBar}
 */
function mount() {
    const bar = document.createElement('core-filter-bar');
    document.body.append(bar);
    return /** @type {CoreFilterBar} */ (bar);
}

/**
 * @param {HTMLElement} bar
 * @param {string} definitionId
 * @returns {HTMLElement|null}
 */
function row(bar, definitionId) {
    return [...bar.querySelectorAll('[data-instance-id]')].find((node) => {
        const id = node.getAttribute('data-instance-id') || '';
        return id === definitionId || id.startsWith(`${definitionId}-`);
    }) || null;
}

/**
 * @param {HTMLElement} bar
 * @param {string} definitionId
 * @returns {HTMLInputElement|HTMLSelectElement|null}
 */
function control(bar, definitionId) {
    return row(bar, definitionId)?.querySelector('input, select') || null;
}

async function flush() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

/**
 * @param {Element|null|undefined} node
 * @returns {number}
 */
function levelCount(node) {
    let count = 0;
    let current = node;
    while (current) {
        if (current.classList?.contains('core-filter-bar__tree-level')) {
            count += 1;
        }
        current = current.parentElement;
    }
    return count;
}

test('filter bar sources do not import a grid, a query language, or a data backend', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const source = [
        'components/core-filter-bar/core-filter-bar.js',
        'components/core-filter-bar/filter-editor-adapters.js',
    ].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
    assert.equal(/ag-grid|agGrid|\bSQL\b|data-source\.js/i.test(source), false);
    assert.equal(source.includes('core-menu.js'), true);
    const sibling = '/agent/repos/core_js/lib/filter/core-filter-engine.js';
    if (fs.existsSync(sibling)) {
        const copy = path.join(root, 'doc/assets/engine/lib/filter/core-filter-engine.js');
        assert.equal(fs.readFileSync(copy, 'utf8'), fs.readFileSync(sibling, 'utf8'));
    }
});

test('a minimal catalog infers labels and operators', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [
            { id: 'name', type: 'string' },
            { id: 'amount', type: 'decimal' },
        ],
    });
    const definitions = bar.getDefinitions();
    assert.equal(definitions[0].label, 'Name');
    assert.equal(definitions[0].defaultOperator, 'contains');
    assert.equal(definitions[0].operators.includes('contains'), true);
    assert.equal(definitions[1].label, 'Amount');
    assert.equal(definitions[1].editor, 'formatted');
    assert.equal(typeof definitions[0].provider, 'undefined');
    const picker = bar.querySelector('core-filter-picker');
    assert.equal(picker.querySelector('[data-entry-id="name"]') != null || picker.getEntries?.().some((entry) => entry.id === 'name'), true);
    bar.destroy();
});

test('choosing a catalog entry adds a user filter and focuses its editor', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [
            { id: 'name', type: 'string' },
            { id: 'amount', type: 'decimal' },
        ],
    });
    /** @type {string[]} */
    const sources = [];
    bar.events$.subscribe((event) => {
        if (event.type === 'filterAdded') {
            sources.push(event.source);
        }
    });
    bar.querySelector('core-filter-picker').dispatchEvent(new CustomEvent('core-filter-picker-select', {
        bubbles: true,
        detail: { id: 'name', label: 'Name', description: '', keywords: [], groupPath: [] },
    }));
    assert.deepEqual(sources, ['user']);
    const input = control(bar, 'name');
    assert.equal(input instanceof HTMLElement, true);
    assert.equal(focused.at(-1), input);
    bar.addFilter('amount');
    assert.deepEqual(sources, ['user', 'api']);
    bar.destroy();
});

test('typed text and an invalid email stay on the instance', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [
            { id: 'name', type: 'string' },
            { id: 'mail', type: 'email' },
        ],
    });
    bar.addFilter('name');
    const name = /** @type {HTMLInputElement} */ (control(bar, 'name'));
    name.value = 'A';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    name.value = 'Ada';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(name.isConnected, true);
    assert.equal(control(bar, 'name'), name);
    assert.equal(bar.getState().filters[0].value, 'Ada');
    assert.equal(name.value, 'Ada');

    bar.addFilter('mail');
    const mail = /** @type {HTMLInputElement} */ (control(bar, 'mail'));
    mail.value = 'not-an-email';
    mail.dispatchEvent(new Event('input', { bubbles: true }));
    const typed = bar.getState().filters.find((item) => item.definitionId === 'mail');
    assert.equal(typed.status, 'invalid');
    assert.equal(typed.value, null);
    assert.equal(typed.rawValue, 'not-an-email');
    assert.equal(mail.value, 'not-an-email');
    assert.equal(bar.getCriteria().criteria, null);
    bar.destroy();
});

test('an invalid decimal draft is kept and a between operator swaps in a range editor', () => {
    clearBody();
    const bar = mount();
    bar.configure({ definitions: [{ id: 'amount', type: 'decimal' }] });
    const id = bar.addFilter('amount');
    const input = /** @type {HTMLInputElement} */ (control(bar, 'amount'));
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const draft = bar.getState().filters[0];
    assert.equal(draft.status, 'invalid');
    assert.equal(draft.rawValue, 'abc');
    assert.equal(input.value, 'abc');
    const before = bar.getState().revision;
    row(bar, 'amount').querySelector('core-menu').dispatchEvent(new CustomEvent('core-menu-select', {
        bubbles: true,
        detail: { value: 'between' },
    }));
    const next = bar.getState().filters[0];
    assert.equal(next.operator, 'between');
    assert.equal(next.instanceId, id);
    assert.equal(bar.getState().revision, before + 1);
    assert.equal(row(bar, 'amount').querySelector('core-range-field') != null, true);
    bar.destroy();
});

test('clear empties a value and remove deletes the instance', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [{ id: 'name', type: 'string' }],
        initialFilters: [{ definitionId: 'name', value: 'Ada', removable: true }],
    });
    const host = row(bar, 'name');
    const input = /** @type {HTMLInputElement} */ (control(bar, 'name'));
    input.focus();
    [...host.querySelectorAll('core-button')].find((button) => button.getAttribute('label') === 'Clear value').click();
    assert.equal(bar.getState().filters[0].status, 'empty');
    assert.equal(bar.getState().filters[0].value, null);
    assert.equal(input.isConnected, true);
    assert.equal(input.value, '');
    [...host.querySelectorAll('core-button')].find((button) => button.getAttribute('label') === 'Remove').click();
    assert.equal(bar.getState().filters.length, 0);
    bar.destroy();
});

test('pin lock, group moves, and twenty rows follow the engine', () => {
    clearBody();
    const bar = mount();
    const definitions = [
        { id: 'locked', type: 'string' },
        { id: 'one', type: 'string', allowMultipleInstances: true },
        { id: 'two', type: 'string' },
    ];
    for (let index = 0; index < 17; index += 1) {
        definitions.push({ id: `extra${index}`, type: 'string' });
    }
    bar.configure({
        definitions,
        initialFilters: [
            { definitionId: 'locked', pinned: true, value: 'keep' },
            ...definitions.slice(1).map((definition) => ({ definitionId: definition.id })),
        ],
    });
    assert.equal(bar.querySelectorAll('[data-instance-id]').length, 20);
    const locked = row(bar, 'locked');
    const pin = [...locked.querySelectorAll('core-button')].find((button) => button.getAttribute('label') === 'Unpin');
    assert.equal(pin.hasAttribute('disabled'), true);
    pin.click();
    assert.equal(bar.getState().filters[0].pinned, true);
    assert.equal(bar.getState().filters[0].pinLocked, true);

    const one = row(bar, 'one');
    const earlierKey = new Event('keydown', { bubbles: true, cancelable: true });
    earlierKey.key = 'ArrowUp';
    one.querySelector('.core-filter-bar__handle').dispatchEvent(earlierKey);
    assert.deepEqual(bar.getState().filters.slice(0, 3).map((item) => item.definitionId), ['locked', 'one', 'two']);
    const later = [...one.querySelectorAll('core-button')].find((button) => button.getAttribute('label') === 'Move later');
    later.click();
    assert.deepEqual(bar.getState().filters.slice(0, 3).map((item) => item.definitionId), ['locked', 'two', 'one']);

    const added = bar.addFilter('one');
    const userRow = bar.querySelector(`[data-instance-id="${added}"]`);
    [...userRow.querySelectorAll('core-button')].find((button) => button.getAttribute('label') === 'Pin').click();
    const pinned = bar.getState().filters.find((item) => item.instanceId === added);
    assert.equal(pinned.pinned, true);
    assert.equal(pinned.pinLocked, false);
    [...bar.querySelector(`[data-instance-id="${added}"]`).querySelectorAll('core-button')]
        .find((button) => button.getAttribute('label') === 'Unpin')
        .click();
    assert.equal(bar.getState().filters.find((item) => item.instanceId === added).pinned, false);
    bar.destroy();
});

test('is empty hides clear and a duplicate definition is not offered again', () => {
    clearBody();
    const bar = mount();
    bar.configure({ definitions: [{ id: 'name', type: 'string' }] });
    bar.addFilter('name');
    row(bar, 'name').querySelector('core-menu').dispatchEvent(new CustomEvent('core-menu-select', {
        bubbles: true,
        detail: { value: 'isEmpty' },
    }));
    const host = row(bar, 'name');
    const clear = [...host.querySelectorAll('core-button')].find((button) => button.getAttribute('label') === 'Clear value');
    assert.equal(clear.hidden, true);
    assert.equal(host.querySelector('[data-core-filter-editor] input'), null);
    const picker = bar.querySelector('core-filter-picker');
    const entry = picker.getEntries().find((item) => item.id === 'name');
    assert.equal(entry.disabled, true);
    bar.destroy();
});

test('layouts and validation modes', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        defaults: { validation: { mode: 'immediate' } },
        definitions: [{ id: 'name', type: 'string', required: true }],
        initialFilters: [{ definitionId: 'name' }],
    });
    assert.equal(bar.querySelector('.core-filter-bar').className.includes('wrap'), true);
    assert.match(row(bar, 'name').querySelector('.core-filter-bar__error').textContent, /required/i);
    bar.setAttribute('layout', 'scroll');
    assert.equal(bar.querySelector('.core-filter-bar').className.includes('scroll'), true);
    bar.setAttribute('layout', 'vertical');
    assert.equal(bar.querySelector('.core-filter-bar').className.includes('vertical'), true);
    bar.destroy();

    const touched = mount();
    touched.configure({
        defaults: { validation: { mode: 'touched' } },
        definitions: [{ id: 'name', type: 'string', required: true }],
        initialFilters: [{ definitionId: 'name' }],
    });
    assert.equal(row(touched, 'name').querySelector('.core-filter-bar__error').hidden, true);
    control(touched, 'name').dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(row(touched, 'name').querySelector('.core-filter-bar__error').hidden, false);
    touched.destroy();

    const manual = mount();
    manual.configure({
        defaults: { validation: { mode: 'manual' } },
        definitions: [{ id: 'name', type: 'string', required: true }],
        initialFilters: [{ definitionId: 'name' }],
    });
    control(manual, 'name').dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(row(manual, 'name').querySelector('.core-filter-bar__error').hidden, true);
    manual.validate();
    assert.equal(row(manual, 'name').querySelector('.core-filter-bar__error').hidden, false);
    manual.destroy();
});

test('setValue updates the field once and a custom editor update stays quiet', () => {
    clearBody();
    const bar = mount();
    let updates = 0;
    bar.configure({
        extensions: {
            registry: {
                editors: {
                    note() {
                        return {
                            mount(host) {
                                host.textContent = 'note';
                            },
                            update() {
                                updates += 1;
                            },
                            focus() {},
                            destroy() {},
                        };
                    },
                },
            },
        },
        definitions: [{ id: 'note', type: 'string', editorRef: 'note' }],
        initialFilters: [{ definitionId: 'note', value: 'x' }],
    });
    let changes = 0;
    bar.events$.subscribe((event) => {
        if (event.type === 'valueChanged') {
            changes += 1;
        }
    });
    const id = bar.getState().filters[0].instanceId;
    bar.setValue(id, 'y');
    assert.equal(changes, 1);
    assert.equal(updates > 0, true);
    assert.equal(bar.getState().filters[0].value, 'y');
    bar.destroy();
});

test('autocomplete editing clears the previous selection until the next choice', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [{
            id: 'account',
            type: 'autocomplete',
            options: [{ value: '100', label: 'Account 100' }],
        }],
    });
    bar.addFilter('account');
    const widget = row(bar, 'account').querySelector('core-autocomplete');
    widget.dispatchEvent(new CustomEvent('autocomplete-select', {
        bubbles: true,
        detail: { result: { title: 'Account 100', value: '100' } },
    }));
    assert.equal(bar.getCriteria().criteria[0].value, '100');
    widget.dispatchEvent(new CustomEvent('autocomplete-change', {
        bubbles: true,
        detail: { query: 'Acc' },
    }));
    assert.equal(bar.getState().filters[0].status, 'pending');
    assert.equal(bar.getState().filters[0].rawValue, 'Acc');
    assert.equal(bar.getCriteria().criteria, null);
    widget.dispatchEvent(new CustomEvent('autocomplete-select', {
        bubbles: true,
        detail: { result: { title: 'Account 100', value: '100' } },
    }));
    assert.equal(bar.getState().filters[0].status, 'valid');
    assert.equal(bar.getCriteria().criteria[0].value, '100');
    bar.destroy();
});

test('a stale option response is ignored and the chosen value stays', async () => {
    clearBody();
    const bar = mount();
    /** @type {{ signal: AbortSignal, resolve: Function }[]} */
    const pending = [];
    bar.configure({
        definitions: [
            {
                id: 'city',
                type: 'select',
                options(ctx) {
                    return new Promise((resolve) => {
                        pending.push({ signal: ctx.signal, resolve });
                    });
                },
            },
            { id: 'name', type: 'string' },
        ],
        initialFilters: [{ definitionId: 'city', value: 'kept', selectedLabel: 'Kept' }],
    });
    await flush();
    assert.equal(pending.length, 1);
    const first = pending[0];
    bar.addFilter('name');
    await flush();
    assert.equal(first.signal.aborted, true);
    assert.equal(pending.length, 2);
    pending[1].resolve([{ value: 'paris', label: 'Paris' }]);
    await flush();
    first.resolve([{ value: 'stale', label: 'Stale' }]);
    await flush();
    const select = /** @type {HTMLSelectElement} */ (control(bar, 'city'));
    const labels = [...select.options].map((option) => option.textContent);
    assert.equal(labels.includes('Paris'), true);
    assert.equal(labels.includes('Kept'), true);
    assert.equal(labels.includes('Stale'), false);
    assert.equal(bar.getState().filters.find((item) => item.definitionId === 'city').value, 'kept');
    bar.destroy();
});

test('setValue shows the select value while the previous option stays listed', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [{ id: 'status', type: 'select', options: ['Open', 'Closed'] }],
    });
    /** @type {{ type: string, source: string }[]} */
    const events = [];
    bar.events$.subscribe((event) => events.push({ type: event.type, source: event.source }));
    const id = bar.addFilter('status');
    const select = () => /** @type {HTMLSelectElement} */ (control(bar, 'status'));
    const shown = () => [...select().options].find((option) => option.selected)?.value ?? '';
    const listed = () => [...select().options].map((option) => option.value);

    let cursor = events.length;
    bar.setValue(id, 'Open');
    assert.equal(shown(), 'Open');
    assert.equal(select().value, 'Open');
    assert.equal(listed().includes('Open'), true);
    assert.equal(listed().includes('Closed'), true);
    assert.equal(bar.getState().filters[0].value, 'Open');
    assert.equal(bar.getCriteria().criteria[0].value, 'Open');
    assert.deepEqual(events.slice(cursor).map((event) => event.source), ['api']);

    cursor = events.length;
    bar.setValue(id, 'Closed');
    assert.equal(shown(), 'Closed');
    assert.equal(select().value, 'Closed');
    assert.equal(listed().includes('Open'), true);
    assert.equal(bar.getState().filters[0].value, 'Closed');
    assert.equal(bar.getCriteria().criteria[0].value, 'Closed');
    assert.deepEqual(events.slice(cursor).map((event) => event.source), ['api']);

    cursor = events.length;
    bar.clearFilter(id);
    assert.equal(shown(), '');
    assert.equal(select().value, '');
    assert.equal(listed().includes('Open'), true);
    assert.equal(listed().includes('Closed'), true);
    assert.equal(bar.getState().filters[0].status, 'empty');
    assert.equal(bar.getState().filters[0].value, null);
    assert.deepEqual(bar.getCriteria().criteria, []);
    assert.deepEqual(events.slice(cursor).map((event) => event.source), ['api']);
    assert.equal(events.some((event) => event.source === 'user'), false);
    bar.destroy();
});

test('changing another filter does not rebuild an open multi-select', async () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [
            { id: 'colors', type: 'multiSelect', options: ['Red', 'Blue'] },
            { id: 'name', type: 'string' },
        ],
    });
    bar.addFilter('colors');
    const nameId = bar.addFilter('name');
    const widget = row(bar, 'colors').querySelector('core-multi-select');
    widget.open();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const search = document.querySelector('.core-multi-select__search');
    assert.equal(search != null, true);
    search.focus();
    const focusCount = focused.length;
    const focusedSearch = focused.at(-1) === search;
    let optionWrites = 0;
    let selectionWrites = 0;
    const originalOptions = widget.setOptions.bind(widget);
    const originalSelected = widget.setSelected.bind(widget);
    widget.setOptions = (options) => {
        optionWrites += 1;
        return originalOptions(options);
    };
    widget.setSelected = (values) => {
        selectionWrites += 1;
        return originalSelected(values);
    };
    bar.setValue(nameId, 'kept');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(optionWrites, 0);
    assert.equal(selectionWrites, 0);
    assert.equal(document.querySelector('.core-multi-select__search') === search, true);
    assert.equal(search.isConnected, true);
    assert.equal(widget._open, true);
    assert.equal(focused.length, focusCount);
    assert.equal(focusedSearch, true);
    assert.equal(focused.at(-1) === search, true);
    assert.equal(bar.getState().filters.find((item) => item.definitionId === 'name').value, 'kept');
    widget.close();
    bar.destroy();
});

test('updateDefinition refreshes one row and ignores a stale provider', async () => {
    clearBody();
    const bar = mount();
    let releasePrevious;
    const previousGate = new Promise((resolve) => {
        releasePrevious = resolve;
    });
    /** @type {string[]} */
    const calls = [];
    function previousProvider(ctx) {
        calls.push('previous');
        ctx.signal.addEventListener('abort', () => calls.push('abort'));
        return previousGate.then(() => [{ value: 'old', label: 'Old' }]);
    }
    function nextProvider() {
        calls.push('next');
        return [{ value: 'new', label: 'New' }];
    }
    bar.configure({
        definitions: [
            { id: 'city', type: 'select', label: 'City', options: ['Paris'] },
            { id: 'name', type: 'string' },
        ],
    });
    bar.addFilter('city');
    const nameId = bar.addFilter('name');
    bar.setValue(nameId, 'kept');
    const cityRow = row(bar, 'city');
    const nameInput = control(bar, 'name');

    bar.updateDefinition('city', { options: ['Lyon'] });
    const swapped = /** @type {HTMLSelectElement} */ (control(bar, 'city'));
    assert.equal(row(bar, 'city'), cityRow);
    assert.equal([...swapped.options].some((option) => option.value === 'Lyon'), true);
    assert.equal([...swapped.options].some((option) => option.value === 'Paris'), false);
    assert.equal(control(bar, 'name'), nameInput);
    assert.equal(nameInput.value, 'kept');

    bar.updateDefinition('city', { options: previousProvider });
    await flush();
    assert.equal(calls.includes('previous'), true);
    bar.updateDefinition('city', {
        label: 'Ville',
        operators: ['eq', 'neq'],
        options: nextProvider,
    });
    await flush();
    releasePrevious();
    await flush();
    assert.equal(calls.includes('abort'), true);
    assert.equal(calls.includes('next'), true);
    const select = /** @type {HTMLSelectElement} */ (control(bar, 'city'));
    const labels = [...select.options].map((option) => option.textContent);
    assert.equal(labels.includes('New'), true);
    assert.equal(labels.includes('Old'), false);
    assert.equal(labels.includes('Lyon'), false);
    assert.equal(row(bar, 'city'), cityRow);
    assert.equal(cityRow.querySelector('.core-filter-bar__label').textContent, 'Ville');
    assert.deepEqual(
        [...cityRow.querySelectorAll('core-menu-item')].map((item) => item.getAttribute('value')),
        ['eq', 'neq'],
    );
    assert.equal(control(bar, 'name'), nameInput);
    assert.equal(nameInput.value, 'kept');
    assert.equal(bar.getState().filters.find((item) => item.definitionId === 'name').value, 'kept');
    bar.destroy();
});

test('an open operator menu is not rebuilt when another filter changes', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [
            { id: 'city', type: 'select', options: ['Paris', 'Lyon'] },
            { id: 'name', type: 'string' },
        ],
    });
    bar.addFilter('city');
    const nameId = bar.addFilter('name');
    const menu = row(bar, 'city').querySelector('core-menu');
    menu.openMenu();
    const panel = document.getElementById(menu.panelId);
    const items = [...panel.children].filter((node) => node.localName === 'core-menu-item');
    const before = document.querySelectorAll('core-menu-item').length;
    assert.equal(menu.open, true);
    assert.equal(items.length > 0, true);
    bar.setValue(nameId, 'kept');
    assert.equal(menu.open, true);
    assert.equal(document.getElementById(menu.panelId), panel);
    const after = [...panel.children].filter((node) => node.localName === 'core-menu-item');
    assert.equal(after.length, items.length);
    after.forEach((item, index) => {
        assert.equal(item === items[index], true);
    });
    assert.equal(document.querySelectorAll('core-menu-item').length, before);
    assert.equal(bar.getState().filters.find((item) => item.definitionId === 'name').value, 'kept');
    menu.closeMenu();
    bar.destroy();
});

test('a late provider response does not replace static options', async () => {
    clearBody();
    const bar = mount();
    let releasePrevious;
    const previousGate = new Promise((resolve) => {
        releasePrevious = resolve;
    });
    /** @type {string[]} */
    const calls = [];
    function previousProvider(ctx) {
        calls.push('previous');
        ctx.signal.addEventListener('abort', () => calls.push('abort'));
        return previousGate.then(() => [{ value: 'late', label: 'Late' }]);
    }
    bar.configure({
        definitions: [{ id: 'city', type: 'select', options: previousProvider }],
    });
    bar.addFilter('city');
    await flush();
    assert.equal(calls.includes('previous'), true);
    bar.updateDefinition('city', { options: ['Paris'] });
    const shown = () => [.../** @type {HTMLSelectElement} */ (control(bar, 'city')).options].map((option) => option.value);
    assert.equal(shown().includes('Paris'), true);
    assert.equal(shown().includes('late'), false);
    assert.equal(calls.includes('abort'), true);
    releasePrevious();
    await flush();
    assert.equal(shown().includes('Paris'), true);
    assert.equal(shown().includes('late'), false);
    bar.destroy();
});

test('autocomplete uses the replacement provider', async () => {
    clearBody();
    const bar = mount();
    /** @type {string[][]} */
    const calls = [];
    function providerA(ctx) {
        calls.push(['A', ctx.query]);
        return [{ value: 'a', label: 'Alpha' }];
    }
    function providerB(ctx) {
        calls.push(['B', ctx.query]);
        return [{ value: 'b', label: 'Beta' }];
    }
    bar.configure({
        definitions: [
            { id: 'account', type: 'autocomplete', options: providerA },
            { id: 'name', type: 'string' },
        ],
    });
    bar.addFilter('account');
    const nameId = bar.addFilter('name');
    bar.setValue(nameId, 'kept');
    const nameInput = control(bar, 'name');
    const widget = row(bar, 'account').querySelector('core-autocomplete');
    const first = widget._dataSource;
    first('aaa').subscribe({ next() {}, error() {} });
    await flush();
    assert.deepEqual(calls, [['A', 'aaa']]);
    bar.updateDefinition('account', { options: providerB });
    const second = widget._dataSource;
    assert.equal(second === first, false);
    assert.equal(row(bar, 'account').querySelector('core-autocomplete'), widget);
    calls.length = 0;
    second('bbb').subscribe({ next() {}, error() {} });
    await flush();
    assert.deepEqual(calls, [['B', 'bbb']]);
    calls.length = 0;
    first('ccc').subscribe({ next() {}, error() {} });
    await flush();
    assert.deepEqual(calls, [['B', 'ccc']]);
    assert.equal(control(bar, 'name'), nameInput);
    assert.equal(nameInput.value, 'kept');
    bar.destroy();
});

test('changing another filter does not rebuild a tree selection', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [
            {
                id: 'place',
                type: 'treeSelect',
                options: [
                    { value: 'desk', label: 'Desk' },
                    { value: 'room', label: 'Room' },
                ],
            },
            { id: 'name', type: 'string' },
        ],
    });
    const placeId = bar.addFilter('place');
    const nameId = bar.addFilter('name');
    bar.setValue(placeId, ['desk']);
    const boxes = [...row(bar, 'place').querySelectorAll('input[type="checkbox"]')];
    const desk = boxes.find((box) => box.checked);
    assert.equal(desk != null, true);
    desk.focus();
    const focusCount = focused.length;
    bar.setValue(nameId, 'kept');
    const again = [...row(bar, 'place').querySelectorAll('input[type="checkbox"]')];
    assert.equal(again.length, boxes.length);
    again.forEach((box, index) => {
        assert.equal(box === boxes[index], true);
    });
    assert.equal(desk.checked, true);
    assert.equal(desk.isConnected, true);
    assert.equal(focused.length, focusCount);
    assert.equal(focused.at(-1) === desk, true);
    assert.deepEqual(bar.getState().filters.find((item) => item.definitionId === 'place').value, ['desk']);
    assert.equal(bar.getState().filters.find((item) => item.definitionId === 'name').value, 'kept');
    bar.destroy();
});

test('a provider tree keeps nested categories after another filter changes', async () => {
    clearBody();
    const bar = mount();
    function places() {
        return [{
            label: 'Europe',
            children: [{
                label: 'France',
                children: [
                    { value: 'paris', label: 'Paris' },
                    { value: 'lyon', label: 'Lyon' },
                ],
            }],
        }];
    }
    bar.configure({
        definitions: [
            { id: 'place', type: 'treeSelect', options: places },
            { id: 'name', type: 'string' },
        ],
    });
    bar.addFilter('place');
    const nameId = bar.addFilter('name');
    await flush();
    const place = row(bar, 'place');
    const labels = () => [...place.querySelectorAll('.core-filter-bar__tree-label')].map((node) => node.textContent);
    const boxes = () => [...place.querySelectorAll('input[type="checkbox"]')];
    assert.deepEqual(labels(), ['Europe', 'France']);
    assert.equal(boxes().length, 2);
    const paris = boxes().find((box) => box.nextElementSibling?.textContent === 'Paris');
    assert.equal(paris != null, true);
    assert.equal(levelCount(paris), 3);
    const before = boxes();
    paris.focus();
    const focusCount = focused.length;
    bar.setValue(nameId, 'kept');
    await flush();
    const after = boxes();
    assert.equal(after.length, before.length);
    after.forEach((box, index) => {
        assert.equal(box === before[index], true);
    });
    assert.deepEqual(labels(), ['Europe', 'France']);
    assert.equal(levelCount(paris), 3);
    assert.equal(paris.isConnected, true);
    assert.equal(focused.length, focusCount);
    assert.equal(focused.at(-1) === paris, true);
    assert.equal(bar.getState().filters.find((item) => item.definitionId === 'name').value, 'kept');
    bar.destroy();
});

test('a checked tree box stays put when another filter changes', () => {
    clearBody();
    const bar = mount();
    bar.configure({
        definitions: [
            {
                id: 'place',
                type: 'treeSelect',
                options: [
                    { value: 'desk', label: 'Desk' },
                    { value: 'room', label: 'Room' },
                ],
            },
            { id: 'name', type: 'string' },
        ],
    });
    bar.addFilter('place');
    const nameId = bar.addFilter('name');
    const boxes = [...row(bar, 'place').querySelectorAll('input[type="checkbox"]')];
    const desk = boxes.find((box) => box.nextElementSibling?.textContent === 'Desk');
    assert.equal(desk != null, true);
    desk.focus();
    desk.checked = true;
    desk.dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(desk.isConnected, true);
    assert.equal(desk.checked, true);
    assert.deepEqual(bar.getState().filters.find((item) => item.definitionId === 'place').value, ['desk']);
    const focusCount = focused.length;
    bar.setValue(nameId, 'kept');
    const again = [...row(bar, 'place').querySelectorAll('input[type="checkbox"]')];
    assert.equal(again.length, boxes.length);
    again.forEach((box, index) => {
        assert.equal(box === boxes[index], true);
    });
    assert.equal(desk.checked, true);
    assert.equal(desk.isConnected, true);
    assert.equal(focused.length, focusCount);
    assert.equal(focused.at(-1) === desk, true);
    assert.deepEqual(bar.getState().filters.find((item) => item.definitionId === 'place').value, ['desk']);
    assert.equal(bar.getState().filters.find((item) => item.definitionId === 'name').value, 'kept');
    bar.destroy();
});

test('disconnect keeps the streams and destroy aborts a provider', async () => {
    clearBody();
    const bar = mount();
    /** @type {AbortSignal[]} */
    const signals = [];
    /** @type {Function[]} */
    const resolvers = [];
    bar.configure({
        definitions: [{
            id: 'city',
            type: 'select',
            options(ctx) {
                signals.push(ctx.signal);
                return new Promise((resolve) => resolvers.push(resolve));
            },
        }],
        initialFilters: [{ definitionId: 'city' }],
    });
    await flush();
    let completed = false;
    bar.state$.subscribe({ complete: () => { completed = true; } });
    bar.remove();
    assert.equal(completed, false);
    assert.equal(signals[0].aborted, true);
    document.body.append(bar);
    assert.equal(bar.querySelector('[data-instance-id]') != null, true);
    bar.destroy();
    assert.equal(completed, true);
    assert.equal(signals.at(-1).aborted, true);
    assert.throws(() => bar.getState(), (error) => error.code === 'E_DESTROYED');
    resolvers.forEach((resolve) => resolve([{ value: 'late', label: 'Late' }]));
    await flush();
    assert.equal(completed, true);
});
