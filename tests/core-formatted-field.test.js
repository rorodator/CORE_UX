import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import '../components/core-field/core-field.js';
import '../components/core-formatted-field/core-formatted-field.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} html
 */
function mount(html) {
    document.body.innerHTML = html;
    return document.body.firstElementChild;
}

/**
 * @param {HTMLInputElement} input
 */
function commit(input) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('focusout', { bubbles: true }));
}

test('doc value copies match the CORE_JS sources', () => {
    const names = [
        'core-value-registry.js',
        'core-value-result.js',
        'core-decimal.js',
        'core-date-time.js',
        'core-relative-date.js'
    ];
    for (const name of names) {
        const doc = fs.readFileSync(path.join(here, '../doc/assets/value', name), 'utf8');
        const src = fs.readFileSync(path.join(here, '../../core_js/lib/value', name), 'utf8');
        assert.equal(doc, src, name);
    }
});

test('core-field type=number stays a native number input', async () => {
    const host = mount('<core-field type="number" label="Age" value="1.239"></core-field>');
    await customElements.whenDefined('core-field');
    const input = host.querySelector('input');
    assert.equal(input.getAttribute('type'), 'number');
    assert.equal(input.value, '1.239');
});

test('formatted field keeps type=text and formats canonical values', async () => {
    const host = mount(`
        <div>
            <core-formatted-field id="fr" value-type="decimal" locale="fr" value="1234.5"></core-formatted-field>
            <core-formatted-field id="us" value-type="decimal" locale="en" value="1234.50"></core-formatted-field>
            <core-formatted-field id="big" value-type="integer" value="9007199254740993"></core-formatted-field>
            <core-formatted-field id="zero" value-type="integer" value="0"></core-formatted-field>
            <core-formatted-field id="date" value-type="date" value="2026-11-02"></core-formatted-field>
            <core-formatted-field id="time" value-type="time" value="14:35:08"></core-formatted-field>
            <core-formatted-field id="local" value-type="datetime" temporal="local" value="2026-11-02T14:35:08"></core-formatted-field>
            <core-formatted-field id="offset" value-type="datetime" temporal="offset" value="2026-11-02T12:35:08Z"></core-formatted-field>
            <core-formatted-field id="rel" value-type="relative-date" value='{"preset":"today"}'></core-formatted-field>
        </div>
    `);
    await customElements.whenDefined('core-formatted-field');
    const read = (id) => host.querySelector(`#${id}`).querySelector('[data-core-formatted-input]');
    for (const id of ['fr', 'us', 'big', 'zero', 'date', 'time', 'local', 'offset', 'rel']) {
        assert.equal(read(id).getAttribute('type'), 'text', id);
    }
    assert.equal(read('fr').value, '1\u00A0234,5');
    assert.equal(read('us').value, '1,234.50');
    assert.equal(read('big').value, '9,007,199,254,740,993');
    assert.equal(host.querySelector('#big').getAttribute('value'), '9007199254740993');
    assert.equal(host.querySelector('#zero').getValueState().status, 'valid');
    assert.equal(host.querySelector('#zero').getValueState().value, '0');
    assert.equal(read('date').value, '02 Nov 2026');
    assert.equal(read('time').value, '14:35:08');
    assert.equal(read('local').value, '02 Nov 2026 14:35:08');
    assert.equal(read('offset').value, '02 Nov 2026 12:35:08 Z');
    assert.equal(read('rel').value, 'Today');
});

test('blur commits FR and US text without rounding and keeps a raw error', async () => {
    const host = mount('<core-formatted-field value-type="decimal" locale="fr" max-fraction-digits="2"></core-formatted-field>');
    await customElements.whenDefined('core-formatted-field');
    const input = host.querySelector('[data-core-formatted-input]');

    input.value = '1 234,5';
    commit(input);
    assert.equal(host.getAttribute('value'), '1234.5');
    assert.equal(input.value, '1\u00A0234,5');

    input.value = '1\u00A0234,50';
    commit(input);
    assert.equal(host.getAttribute('value'), '1234.50');

    host.setAttribute('locale', 'en');
    input.value = '1,234.5';
    commit(input);
    assert.equal(host.getAttribute('value'), '1234.5');
    assert.equal(input.value, '1,234.5');

    input.value = '12,';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(input.value, '12,');
    assert.equal(host.getValueState().status, 'pending');
    commit(input);
    assert.equal(input.value, '12,');
    assert.equal(host.hasAttribute('value'), false);

    input.value = '1.239';
    commit(input);
    const state = host.getValueState();
    assert.equal(state.status, 'invalid');
    assert.equal(state.value, null);
    assert.equal(state.errors[0].code, 'E_PRECISION');
    assert.equal(state.errors[0].details.exact, '1.239');
    assert.equal(input.value, '1.239');
    assert.equal(host.querySelector('[data-core-parse-error]')?.textContent.length > 0, true);

    host.setAttribute('error', 'From parent');
    assert.equal(host.querySelector('[data-core-parse-error]'), null);
    assert.equal(host.querySelector('.core-error-text')?.textContent, 'From parent');
    assert.equal(input.value, '1.239');
});

test('programmatic value does not emit and error updates keep the caret', async () => {
    const host = mount('<core-formatted-field value-type="integer" value="12"></core-formatted-field>');
    await customElements.whenDefined('core-formatted-field');
    const input = host.querySelector('[data-core-formatted-input]');
    let events = 0;
    host.addEventListener('core-formatted-field-input', () => {
        events += 1;
    });
    host.addEventListener('core-formatted-field-change', () => {
        events += 1;
    });
    host.setAttribute('value', '0');
    assert.equal(events, 0);
    assert.equal(input.value, '0');

    input.focus();
    input.value = '12345';
    if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(1, 3);
    }
    host.setAttribute('error', 'Required field');
    const again = host.querySelector('[data-core-formatted-input]');
    assert.equal(again, input);
    assert.equal(input.value, '12345');
    if (typeof input.selectionStart === 'number') {
        assert.equal(input.selectionStart, 1);
        assert.equal(input.selectionEnd, 3);
    }
    assert.equal(input.getAttribute('aria-invalid'), 'true');
});
