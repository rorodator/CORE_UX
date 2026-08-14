import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-icon/core-icon.js';
import '../components/core-button/core-button.js';

/**
 * @param {string} html
 */
function mount(html) {
    document.body.innerHTML = html;
    return document.body.firstElementChild;
}

test('core-button icon-only exposes accessible name and hides visible text', async () => {
    const buttonHost = mount(
        '<core-button variant="ghost" size="sm" icon="edit" icon-only label="Edit item"></core-button>'
    );
    await customElements.whenDefined('core-button');
    assert.ok(buttonHost);
    const button = buttonHost.querySelector('button');
    assert.ok(button);
    assert.equal(button.getAttribute('aria-label'), 'Edit item');
    assert.equal(button.textContent.trim(), '');
    assert.ok(button.querySelector('core-icon'));
});

test('core-button icon-only requires label for tooltip wiring', async () => {
    const buttonHost = mount(
        '<core-button variant="ghost" icon="edit" icon-only label="Edit item"></core-button>'
    );
    await customElements.whenDefined('core-button');
    assert.ok(buttonHost?.querySelector('core-tooltip'));
});

test('core-button disabled state is forwarded', async () => {
    const buttonHost = mount(
        '<core-button variant="ghost" icon="delete" icon-only icon-danger disabled label="Remove item"></core-button>'
    );
    await customElements.whenDefined('core-button');
    const button = buttonHost?.querySelector('button');
    assert.ok(button?.hasAttribute('disabled'));
});
