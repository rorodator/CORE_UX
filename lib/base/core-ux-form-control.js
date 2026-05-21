import { Core_UXElement } from './core-ux-element.js';
import { createElement, hasBoolAttr, mirrorAttributes } from 'CORE_JS/lib/utils/dom.js';

/**
 * Shared behaviour for labelled form controls.
 */
export class Core_UXFormControl extends Core_UXElement {

    constructor() {
        super();
        this._uid = Math.random().toString(36).slice(2, 9);
    }

    /** @returns {string} */
    get fieldId() {
        return this.getAttribute('input-id') || this.getAttribute('id') || `core-field-${this._uid}`;
    }

    /** @returns {string} */
    get label() {
        return this.getAttribute('label') || '';
    }

    /** @returns {string} */
    get hint() {
        return this.getAttribute('hint') || '';
    }

    /** @returns {string} */
    get error() {
        return this.getAttribute('error') || '';
    }

    /** @returns {boolean} */
    get required() {
        return hasBoolAttr(this, 'required');
    }

    /** @returns {boolean} */
    get disabled() {
        return hasBoolAttr(this, 'disabled');
    }

    /** @returns {boolean} */
    get hasError() {
        return this.error.length > 0;
    }

    /**
     * @returns {HTMLElement}
     */
    createFieldShell() {
        return createElement('div', { className: 'core-field' });
    }

    /**
     * @param {HTMLElement} field
     */
    appendLabel(field) {
        if (!this.label) {
            return;
        }
        field.appendChild(createElement('label', {
            className: `core-label${this.required ? ' core-label--required' : ''}`,
            text: this.label,
            attrs: { for: this.fieldId }
        }));
    }

    /**
     * @param {HTMLElement} field
     */
    appendHint(field) {
        if (!this.hint) {
            return;
        }
        field.appendChild(createElement('p', {
            className: 'core-hint',
            text: this.hint,
            attrs: { id: `${this.fieldId}-hint` }
        }));
    }

    /**
     * @param {HTMLElement} field
     */
    appendError(field) {
        if (!this.hasError) {
            return;
        }
        field.appendChild(createElement('p', {
            className: 'core-error-text',
            text: this.error,
            attrs: { id: `${this.fieldId}-error`, role: 'alert' }
        }));
    }

    /**
     * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|null} control
     */
    wireControl(control) {
        if (!control) {
            return;
        }
        control.id = this.fieldId;
        control.disabled = this.disabled;
        control.required = this.required;
        if (this.hasAttribute('name')) {
            control.name = this.getAttribute('name');
        }
        if (this.hasAttribute('placeholder')) {
            control.setAttribute('placeholder', this.getAttribute('placeholder') || '');
        }
        if (this.hasAttribute('value')) {
            control.value = this.getAttribute('value') || '';
        }
        mirrorAttributes(this, control, ['data-core-lang', 'aria-label', 'autocomplete']);
        if (this.hasError) {
            control.setAttribute('aria-invalid', 'true');
            control.setAttribute('aria-describedby', `${this.fieldId}-error`);
        } else if (this.hint) {
            control.setAttribute('aria-describedby', `${this.fieldId}-hint`);
        }
    }
}
