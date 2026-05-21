import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from '../../lib/utils/dom.js';
import { hasBoolAttr } from '../../lib/utils/ux-attributes.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

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

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
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
        const input = this.querySelector('input[type="checkbox"]');
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
