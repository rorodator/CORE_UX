import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from '../../lib/utils/dom.js';
import { parseJsonAttr } from '../../lib/utils/ux-attributes.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

/**
 * Native select field. Options via JSON attribute.
 */
export class CoreSelect extends Core_UXFormControl {

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'options', 'name', 'value',
            'input-id', 'required', 'disabled'
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

    get options() {
        const list = parseJsonAttr(this, 'options', []);
        if (!Array.isArray(list)) {
            return [];
        }
        const selectedValue = this.getAttribute('value');
        return list.map((item) => {
            const value = String(item?.value ?? '');
            const label = String(item?.label ?? value);
            const selected = item?.selected === true
                || (selectedValue !== null && value === selectedValue);
            return { value, label, selected };
        });
    }

    ui_render() {
        const field = this.createFieldShell();
        this.appendLabel(field);

        const wrap = createElement('div', { className: 'core-select-wrap' });
        const select = createElement('select', {
            className: `core-select${this.hasError ? ' core-control--error' : ''}`,
            attrs: { id: this.fieldId }
        });
        this.options.forEach((option) => {
            select.appendChild(createElement('option', {
                text: option.label,
                attrs: {
                    value: option.value,
                    selected: option.selected || false
                }
            }));
        });
        wrap.appendChild(select);
        field.appendChild(wrap);
        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
    }

    ui_toFunctional() {
        this.wireControl(this.querySelector('select'));
    }
}

registerCoreComponent('core-select', CoreSelect);
