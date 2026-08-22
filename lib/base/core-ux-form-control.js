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
     * Attributes that require a full DOM rebuild instead of incremental sync.
     * @returns {string[]}
     */
    get structuralAttributes() {
        return [];
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
        this._syncControlAccessibility(control);
    }

    /**
     * @param {string} name
     * @param {string|null} _oldValue
     * @param {string|null} _newValue
     */
    attributeChangedCallback(name, _oldValue, _newValue) {
        if (!this.isConnected) {
            return;
        }
        if (this.structuralAttributes.includes(name) || !this._hasFieldShell()) {
            this.render();
            return;
        }
        this._handleAttributeChange(name);
    }

    /**
     * @returns {boolean}
     */
    _hasFieldShell() {
        return this.querySelector('.core-field') !== null;
    }

    /**
     * @returns {HTMLElement|null}
     */
    _getFieldShell() {
        return this.querySelector('.core-field');
    }

    /**
     * Subclasses return the native control element for incremental sync.
     * @returns {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|null}
     */
    _getControl() {
        return null;
    }

    /**
     * @returns {ChildNode|null}
     */
    _getLabelInsertBefore() {
        const control = this._getControl();
        if (!control) {
            return this._getFieldShell()?.firstChild ?? null;
        }
        const wrap = control.closest('.core-select-wrap');
        return wrap || control;
    }

    /**
     * @param {string} name
     */
    _handleAttributeChange(name) {
        switch (name) {
            case 'label':
                this._syncLabel();
                break;
            case 'hint':
                this._syncHint();
                break;
            case 'error':
                this._syncError();
                break;
            case 'input-id':
                this._syncFieldIds();
                break;
            case 'required':
            case 'disabled':
            case 'name':
            case 'placeholder':
                this._syncControlAttributes();
                break;
            case 'value':
                this._syncValue();
                break;
            default:
                this.render();
        }
    }

    _syncLabel() {
        const field = this._getFieldShell();
        if (!field) {
            return;
        }
        let labelEl = field.querySelector(':scope > label.core-label');
        if (this.label) {
            if (!labelEl) {
                labelEl = createElement('label', {
                    className: `core-label${this.required ? ' core-label--required' : ''}`,
                    text: this.label,
                    attrs: { for: this.fieldId }
                });
                const anchor = this._getLabelInsertBefore();
                if (anchor) {
                    field.insertBefore(labelEl, anchor);
                } else {
                    field.appendChild(labelEl);
                }
            } else {
                labelEl.textContent = this.label;
                labelEl.className = `core-label${this.required ? ' core-label--required' : ''}`;
                labelEl.setAttribute('for', this.fieldId);
            }
        } else if (labelEl) {
            labelEl.remove();
        }
    }

    _syncHint() {
        const field = this._getFieldShell();
        if (!field) {
            return;
        }
        let hintEl = field.querySelector(':scope > .core-hint');
        if (this.hint) {
            if (!hintEl) {
                hintEl = createElement('p', {
                    className: 'core-hint',
                    text: this.hint,
                    attrs: { id: `${this.fieldId}-hint` }
                });
                const errorEl = field.querySelector(':scope > .core-error-text');
                if (errorEl) {
                    field.insertBefore(hintEl, errorEl);
                } else {
                    field.appendChild(hintEl);
                }
            } else {
                hintEl.textContent = this.hint;
                hintEl.id = `${this.fieldId}-hint`;
            }
        } else if (hintEl) {
            hintEl.remove();
        }
        this._syncControlAccessibility();
    }

    _syncError() {
        const field = this._getFieldShell();
        if (!field) {
            return;
        }
        const control = this._getControl();
        let errorEl = field.querySelector(':scope > .core-error-text');
        if (this.hasError) {
            if (!errorEl) {
                errorEl = createElement('p', {
                    className: 'core-error-text',
                    text: this.error,
                    attrs: { id: `${this.fieldId}-error`, role: 'alert' }
                });
                field.appendChild(errorEl);
            } else {
                errorEl.textContent = this.error;
                errorEl.id = `${this.fieldId}-error`;
            }
            control?.classList.add('core-control--error');
        } else if (errorEl) {
            errorEl.remove();
            control?.classList.remove('core-control--error');
        }
        this._syncControlAccessibility();
    }

    _syncFieldIds() {
        const control = this._getControl();
        if (control) {
            control.id = this.fieldId;
        }
        const field = this._getFieldShell();
        field?.querySelector(':scope > label.core-label')?.setAttribute('for', this.fieldId);
        const hintEl = field?.querySelector(':scope > .core-hint');
        if (hintEl) {
            hintEl.id = `${this.fieldId}-hint`;
        }
        const errorEl = field?.querySelector(':scope > .core-error-text');
        if (errorEl) {
            errorEl.id = `${this.fieldId}-error`;
        }
        this._syncControlAccessibility();
    }

    _syncControlAttributes() {
        const control = this._getControl();
        if (!control) {
            return;
        }
        control.disabled = this.disabled;
        control.required = this.required;
        if (this.hasAttribute('name')) {
            control.name = this.getAttribute('name') || '';
        } else {
            control.removeAttribute('name');
        }
        if (this.hasAttribute('placeholder')) {
            control.setAttribute('placeholder', this.getAttribute('placeholder') || '');
        } else {
            control.removeAttribute('placeholder');
        }
        mirrorAttributes(this, control, ['data-core-lang', 'aria-label', 'autocomplete']);
        const labelEl = this._getFieldShell()?.querySelector(':scope > label.core-label');
        if (labelEl && this.label) {
            labelEl.className = `core-label${this.required ? ' core-label--required' : ''}`;
        }
        this._syncControlAccessibility();
    }

    _syncValue() {
        const control = this._getControl();
        if (!control || !this.hasAttribute('value')) {
            return;
        }
        if (document.activeElement === control) {
            return;
        }
        const nextValue = this.getAttribute('value') || '';
        if (control.value !== nextValue) {
            control.value = nextValue;
        }
    }

    /**
     * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|null} [control]
     */
    _syncControlAccessibility(control = this._getControl()) {
        if (!control) {
            return;
        }
        if (this.hasError) {
            control.setAttribute('aria-invalid', 'true');
            control.setAttribute('aria-describedby', `${this.fieldId}-error`);
        } else {
            control.removeAttribute('aria-invalid');
            if (this.hint) {
                control.setAttribute('aria-describedby', `${this.fieldId}-hint`);
            } else {
                control.removeAttribute('aria-describedby');
            }
        }
    }
}
