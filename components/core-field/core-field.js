import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Single-line field — types: text | email | password | number | date | tel | url | search.
 */
export class CoreField extends Core_UXFormControl {

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'name', 'value', 'placeholder',
            'input-id', 'type', 'required', 'disabled', 'min', 'max', 'step'
        ];
    }

    get structuralAttributes() {
        return ['type'];
    }

    onConnect() {
        this.render();
    }

    get inputType() {
        const type = this.getAttribute('type') || 'text';
        const allowed = ['text', 'email', 'password', 'number', 'date', 'tel', 'url', 'search'];
        return allowed.includes(type) ? type : 'text';
    }

    _getControl() {
        return this.querySelector('input');
    }

    /**
     * @param {string} name
     */
    _handleAttributeChange(name) {
        if (['min', 'max', 'step'].includes(name)) {
            this._syncNumericAttributes(name);
            return;
        }
        super._handleAttributeChange(name);
    }

    /**
     * @param {string} name
     */
    _syncNumericAttributes(name) {
        const input = this._getControl();
        if (!input) {
            return;
        }
        if (this.hasAttribute(name)) {
            input.setAttribute(name, this.getAttribute(name) || '');
        } else {
            input.removeAttribute(name);
        }
    }

    ui_render() {
        const field = this.createFieldShell();
        this.appendLabel(field);
        field.appendChild(createElement('input', {
            className: `core-control${this.hasError ? ' core-control--error' : ''}`,
            attrs: { type: this.inputType, id: this.fieldId }
        }));
        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
    }

    ui_toFunctional() {
        const input = this._getControl();
        this.wireControl(input);
        if (!input) {
            return;
        }
        for (const attribute of ['min', 'max', 'step']) {
            this._syncNumericAttributes(attribute);
        }
    }
}

registerCoreComponent('core-field', CoreField);
