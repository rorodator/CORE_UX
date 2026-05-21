import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from '../../lib/utils/dom.js';
import { parseJsonAttr } from '../../lib/utils/ux-attributes.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

/**
 * Radio group. Options via JSON attribute.
 */
export class CoreRadioGroup extends Core_UXFormControl {

    static get observedAttributes() {
        return ['label', 'hint', 'error', 'name', 'options', 'value', 'layout', 'required', 'disabled'];
    }

    onConnect() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get groupName() {
        return this.getAttribute('name') || this.fieldId;
    }

    get layoutClass() {
        return this.getAttribute('layout') === 'inline'
            ? 'core-radio-group--inline'
            : '';
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
        const fieldset = createElement('fieldset', { className: 'core-field' });
        if (this.label) {
            fieldset.appendChild(createElement('legend', {
                className: `core-label${this.required ? ' core-label--required' : ''}`,
                text: this.label
            }));
        }

        const group = createElement('div', {
            className: `core-radio-group ${this.layoutClass}`.trim()
        });
        this.options.forEach((option) => {
            const row = createElement('label', { className: 'core-radio-row' });
            row.appendChild(createElement('input', {
                className: 'core-radio',
                attrs: {
                    type: 'radio',
                    name: this.groupName,
                    value: option.value,
                    checked: option.selected || false
                }
            }));
            row.appendChild(createElement('span', { text: option.label }));
            group.appendChild(row);
        });
        fieldset.appendChild(group);

        if (this.hint) {
            fieldset.appendChild(createElement('p', { className: 'core-hint', text: this.hint }));
        }
        if (this.hasError) {
            fieldset.appendChild(createElement('p', {
                className: 'core-error-text',
                text: this.error,
                attrs: { role: 'alert' }
            }));
        }
        this.replaceChildren(fieldset);
    }

    ui_toFunctional() {
        this.querySelectorAll('input[type="radio"]').forEach((input) => {
            input.disabled = this.disabled;
            input.required = this.required;
        });
    }
}

registerCoreComponent('core-radio-group', CoreRadioGroup);
