import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from '../../lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

/**
 * Text field — types: text | email | password | number | tel | url | search.
 */
export class CoreField extends Core_UXFormControl {

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'name', 'value', 'placeholder',
            'input-id', 'type', 'required', 'disabled'
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
        const allowed = ['text', 'email', 'password', 'number', 'tel', 'url', 'search'];
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
        this.wireControl(this.querySelector('input'));
    }
}

registerCoreComponent('core-field', CoreField);
