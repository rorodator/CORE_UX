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
            'input-id', 'rows', 'maxlength', 'required', 'disabled'
        ];
    }

    onConnect() {
        this.render();
    }

    get rows() {
        const parsed = parseInt(this.getAttribute('rows') || '4', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
    }

    _getControl() {
        return this.querySelector('textarea');
    }

    /**
     * @param {string} name
     */
    _handleAttributeChange(name) {
        if (name === 'rows') {
            const control = this._getControl();
            if (control) {
                control.setAttribute('rows', String(this.rows));
            }
            return;
        }
        if (name === 'maxlength') {
            const control = this._getControl();
            if (!control) {
                return;
            }
            const maxLength = parseInt(this.getAttribute('maxlength') || '', 10);
            if (Number.isFinite(maxLength) && maxLength > 0) {
                control.maxLength = maxLength;
            } else {
                control.removeAttribute('maxlength');
            }
            return;
        }
        super._handleAttributeChange(name);
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
        const control = this._getControl();
        this.wireControl(control);
        this._handleAttributeChange('maxlength');
    }
}

registerCoreComponent('core-textarea', CoreTextarea);
