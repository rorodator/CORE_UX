import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Multiline text field.
 */
export class CoreTextarea extends Core_UXFormControl {

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'name', 'value', 'placeholder',
            'input-id', 'rows', 'required', 'disabled'
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

    get rows() {
        const parsed = parseInt(this.getAttribute('rows') || '4', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
    }

    ui_render() {
        const field = this.createFieldShell();
        this.appendLabel(field);
        field.appendChild(createElement('textarea', {
            className: `core-textarea core-control${this.hasError ? ' core-control--error' : ''}`,
            attrs: { id: this.fieldId, rows: String(this.rows) }
        }));
        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
    }

    ui_toFunctional() {
        this.wireControl(this.querySelector('textarea'));
    }
}

registerCoreComponent('core-textarea', CoreTextarea);
