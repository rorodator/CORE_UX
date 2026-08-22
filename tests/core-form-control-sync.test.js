import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import './linkedom-select-value-shim.mjs';
import '../components/core-field/core-field.js';
import '../components/core-textarea/core-textarea.js';
import '../components/core-checkbox/core-checkbox.js';
import '../components/core-select/core-select.js';

const stylesPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../styles/core-ux.css'
);

/**
 * @param {string} html
 */
function mount(html) {
    document.body.innerHTML = html;
    return document.body.firstElementChild;
}

test('core-ux.css defines prefers-reduced-motion overrides for significant motion', () => {
    const css = fs.readFileSync(stylesPath, 'utf8');
    assert.ok(css.includes('prefers-reduced-motion: reduce'));
    assert.ok(css.includes('.core-spinner'));
    assert.ok(css.includes('.core-side-panel-backdrop'));
    assert.ok(css.includes('.core-notif'));
    assert.ok(css.includes('animation: none'));
    assert.ok(css.includes('transition: none'));
});

test('core-field preserves focused input when error and hint change', async () => {
    const host = mount('<core-field label="Name"></core-field>');
    await customElements.whenDefined('core-field');

    const input = host.querySelector('input');
    assert.ok(input);
    input.focus();
    input.value = 'typed value';
    if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(2, 5);
    }

    host.setAttribute('error', 'Required field');
    const inputAfterError = host.querySelector('input');
    assert.equal(inputAfterError, input);
    assert.equal(input.value, 'typed value');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(input.getAttribute('aria-describedby'), `${input.id}-error`);
    assert.equal(host.querySelector('.core-error-text')?.textContent, 'Required field');

    host.removeAttribute('error');
    host.setAttribute('hint', 'Your full name');
    const inputAfterHint = host.querySelector('input');
    assert.equal(inputAfterHint, input);
    assert.equal(input.value, 'typed value');
    assert.equal(input.hasAttribute('aria-invalid'), false);
    assert.equal(input.getAttribute('aria-describedby'), `${input.id}-hint`);
    assert.equal(host.querySelector('.core-hint')?.textContent, 'Your full name');
});

test('core-field syncs label without replacing the control', async () => {
    const host = mount('<core-field label="Old"></core-field>');
    await customElements.whenDefined('core-field');

    const input = host.querySelector('input');
    input.focus();
    input.value = 'keep';

    host.setAttribute('label', 'New label');
    assert.equal(host.querySelector('label.core-label')?.textContent, 'New label');
    assert.equal(host.querySelector('input'), input);
    assert.equal(input.value, 'keep');
});

test('core-checkbox preserves native input when checked toggles', async () => {
    const host = mount('<core-checkbox label="Accept terms"></core-checkbox>');
    await customElements.whenDefined('core-checkbox');

    const input = host.querySelector('input[type="checkbox"]');
    assert.ok(input);
    assert.equal(input.checked, false);

    host.setAttribute('checked', '');
    assert.equal(host.querySelector('input[type="checkbox"]'), input);
    assert.equal(input.checked, true);

    host.removeAttribute('checked');
    assert.equal(host.querySelector('input[type="checkbox"]'), input);
    assert.equal(input.checked, false);
});

test('core-checkbox syncs label without replacing the control', async () => {
    const host = mount('<core-checkbox label="Old label"></core-checkbox>');
    await customElements.whenDefined('core-checkbox');

    const input = host.querySelector('input[type="checkbox"]');
    input.focus();

    host.setAttribute('label', 'New label');
    assert.equal(host.querySelector('.core-check-row span')?.textContent, 'New label');
    assert.equal(host.querySelector('input[type="checkbox"]'), input);
});

test('core-checkbox keeps ARIA in sync when error and hint change', async () => {
    const host = mount('<core-checkbox label="Subscribe"></core-checkbox>');
    await customElements.whenDefined('core-checkbox');

    const input = host.querySelector('input[type="checkbox"]');
    assert.ok(input);

    host.setAttribute('error', 'You must accept');
    assert.equal(host.querySelector('input[type="checkbox"]'), input);
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(input.getAttribute('aria-describedby'), `${input.id}-error`);
    assert.equal(host.querySelector('.core-error-text')?.textContent, 'You must accept');

    host.removeAttribute('error');
    host.setAttribute('hint', 'Optional newsletter');
    assert.equal(host.querySelector('input[type="checkbox"]'), input);
    assert.equal(input.hasAttribute('aria-invalid'), false);
    assert.equal(input.getAttribute('aria-describedby'), `${input.id}-hint`);
    assert.equal(host.querySelector('.core-hint')?.textContent, 'Optional newsletter');
});

test('core-checkbox syncs disabled, name, and value without replacing the control', async () => {
    const host = mount('<core-checkbox label="Flag" name="flag" value="yes"></core-checkbox>');
    await customElements.whenDefined('core-checkbox');

    const input = host.querySelector('input[type="checkbox"]');
    assert.ok(input);
    assert.equal(input.name, 'flag');
    assert.equal(input.value, 'yes');
    assert.equal(input.disabled, false);

    host.setAttribute('disabled', '');
    host.setAttribute('name', 'flag-updated');
    host.setAttribute('value', 'on');
    assert.equal(host.querySelector('input[type="checkbox"]'), input);
    assert.equal(input.disabled, true);
    assert.equal(input.name, 'flag-updated');
    assert.equal(input.value, 'on');
});

test('core-select preserves native select when label, error, and hint change', async () => {
    const options = '[{"value":"fr","label":"France"},{"value":"de","label":"Germany"}]';
    const host = mount(`<core-select label="Country" options='${options}'></core-select>`);
    await customElements.whenDefined('core-select');

    const select = host.querySelector('select');
    assert.ok(select);

    host.setAttribute('label', 'Nation');
    assert.equal(host.querySelector('select'), select);
    assert.equal(host.querySelector('label.core-label')?.textContent, 'Nation');

    host.setAttribute('error', 'Pick one');
    assert.equal(host.querySelector('select'), select);
    assert.equal(select.getAttribute('aria-invalid'), 'true');
    assert.equal(select.getAttribute('aria-describedby'), `${select.id}-error`);

    host.removeAttribute('error');
    host.setAttribute('hint', 'Your country of residence');
    assert.equal(host.querySelector('select'), select);
    assert.equal(select.hasAttribute('aria-invalid'), false);
    assert.equal(select.getAttribute('aria-describedby'), `${select.id}-hint`);
});

test('core-select refreshes options on the same select node', async () => {
    const host = mount('<core-select label="Plan" options=\'[{"value":"free","label":"Free"}]\'></core-select>');
    await customElements.whenDefined('core-select');

    const select = host.querySelector('select');
    assert.ok(select);
    assert.equal(select.options.length, 1);
    assert.equal(select.options[0].value, 'free');

    host.setAttribute('options', JSON.stringify([
        { value: 'free', label: 'Free tier' },
        { value: 'pro', label: 'Pro tier' }
    ]));
    assert.equal(host.querySelector('select'), select);
    assert.equal(select.options.length, 2);
    assert.equal(select.options[0].textContent, 'Free tier');
    assert.equal(select.options[1].value, 'pro');
});

test('core-select keeps current selection when refreshed options still include it', async () => {
    const host = mount('<core-select label="Country" options=\'[{"value":"fr","label":"France"},{"value":"de","label":"Germany"}]\'></core-select>');
    await customElements.whenDefined('core-select');

    const select = host.querySelector('select');
    select.value = 'de';
    assert.equal(select.value, 'de');

    host.setAttribute('options', JSON.stringify([
        { value: 'fr', label: 'France' },
        { value: 'de', label: 'Deutschland' },
        { value: 'es', label: 'Spain' }
    ]));
    assert.equal(host.querySelector('select'), select);
    assert.equal(select.value, 'de');
    assert.equal(select.options[1].textContent, 'Deutschland');
});

test('core-select falls back to host value when current selection disappears from options', async () => {
    const host = mount('<core-select label="Country" value="fr" options=\'[{"value":"fr","label":"France"},{"value":"de","label":"Germany"}]\'></core-select>');
    await customElements.whenDefined('core-select');

    const select = host.querySelector('select');
    select.value = 'de';
    assert.equal(select.value, 'de');

    host.setAttribute('options', JSON.stringify([
        { value: 'fr', label: 'France' },
        { value: 'es', label: 'Spain' }
    ]));
    assert.equal(host.querySelector('select'), select);
    assert.equal(select.value, 'fr');
});

test('core-select syncs host value when control is not focused', async () => {
    const host = mount('<core-select label="Timezone" value="utc" options=\'[{"value":"utc","label":"UTC"},{"value":"cet","label":"CET"}]\'></core-select>');
    await customElements.whenDefined('core-select');

    const select = host.querySelector('select');
    assert.equal(select.value, 'utc');

    host.setAttribute('value', 'cet');
    assert.equal(host.querySelector('select'), select);
    assert.equal(select.value, 'cet');
});

test('core-select syncs disabled, name, and required without replacing the control', async () => {
    const host = mount('<core-select label="Role" name="role" required options=\'[{"value":"admin","label":"Admin"},{"value":"user","label":"User"}]\'></core-select>');
    await customElements.whenDefined('core-select');

    const select = host.querySelector('select');
    assert.ok(select);
    assert.equal(select.name, 'role');
    assert.equal(select.required, true);
    assert.equal(select.disabled, false);

    host.setAttribute('disabled', '');
    host.removeAttribute('required');
    host.setAttribute('name', 'role-updated');
    assert.equal(host.querySelector('select'), select);
    assert.equal(select.disabled, true);
    assert.equal(select.required, false);
    assert.equal(select.name, 'role-updated');
});

test('core-textarea preserves caret when error updates', async () => {
    const host = mount('<core-textarea label="Notes"></core-textarea>');
    await customElements.whenDefined('core-textarea');

    const textarea = host.querySelector('textarea');
    assert.ok(textarea);
    textarea.focus();
    textarea.value = 'hello world';
    if (typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(6, 11);
    }
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    host.setAttribute('error', 'Too long');
    const textareaAfter = host.querySelector('textarea');
    assert.equal(textareaAfter, textarea);
    assert.equal(textarea.value, 'hello world');
    if (typeof textarea.selectionStart === 'number') {
        assert.equal(textarea.selectionStart, selectionStart);
        assert.equal(textarea.selectionEnd, selectionEnd);
    }
});
