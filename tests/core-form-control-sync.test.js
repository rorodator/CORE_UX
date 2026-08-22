import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import '../components/core-field/core-field.js';
import '../components/core-textarea/core-textarea.js';

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
