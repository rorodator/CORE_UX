import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Checkbox with label.
 */
export class CoreCheckbox extends Core_UXFormControl {

    static get observedAttributes() {
        return ['label', 'hint', 'error', 'checked', 'name', 'value', 'input-id', 'disabled'];
    }

    onConnect() {
        this.render();
    }

    _getControl() {
        return this.querySelector('input[type="checkbox"]');
    }

    _syncLabel() {
        const labelText = this.querySelector('.core-check-row span');
        if (labelText) {
            labelText.textContent = this.label;
        }
    }

    /**
     * @param {string} name
     */
    _handleAttributeChange(name) {
        if (name === 'checked') {
            const input = this._getControl();
            if (input) {
                input.checked = hasBoolAttr(this, 'checked');
            }
            return;
        }
        if (name === 'value') {
            const input = this._getControl();
            if (input && this.hasAttribute('value')) {
                input.value = this.getAttribute('value') || '';
            }
            return;
        }
        super._handleAttributeChange(name);
    }

    ui_render() {
        const field = this.createFieldShell();
        const row = createElement('label', { className: 'core-check-row' });
        row.appendChild(createElement('input', {
            className: 'core-check',
            attrs: { type: 'checkbox', id: this.fieldId }
        }));
        row.appendChild(createElement('span', { text: this.label }));
        field.appendChild(row);
        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
    }

    ui_toFunctional() {
        const input = this._getControl();
        this.wireControl(input);
        if (input) {
            input.checked = hasBoolAttr(this, 'checked');
            if (this.hasAttribute('value')) {
                input.value = this.getAttribute('value') || '';
            }
        }
    }
}

registerCoreComponent('core-checkbox', CoreCheckbox);
