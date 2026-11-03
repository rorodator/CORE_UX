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
