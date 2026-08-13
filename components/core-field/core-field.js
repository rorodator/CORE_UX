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

    onConnect() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get inputType() {
        const type = this.getAttribute('type') || 'text';
        const allowed = ['text', 'email', 'password', 'number', 'date', 'tel', 'url', 'search'];
        return allowed.includes(type) ? type : 'text';
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
        const input = this.querySelector('input');
        this.wireControl(input);
        if (!input) {
            return;
        }
        for (const attribute of ['min', 'max', 'step']) {
            if (this.hasAttribute(attribute)) {
                input.setAttribute(attribute, this.getAttribute(attribute) || '');
            }
        }
    }
}

registerCoreComponent('core-field', CoreField);
