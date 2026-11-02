import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import {
    formatValue,
    parseValue,
    readFormattedOptions,
    serializeCanonical
} from '../../lib/formatted/formatted-options.js';

/**
 * Text field for exact integers, decimals, dates, times, and datetimes.
 * This is not a calendar or a clock popup. `core-field` type=number|date is unchanged.
 *
 * Events: `core-formatted-field-input`, `core-formatted-field-change`.
 * `detail`: `{ value, rawValue, status, errors }`. Programmatic `value` updates do not emit.
 */
export class CoreFormattedField extends Core_UXFormControl {

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'name', 'value', 'placeholder', 'input-id',
            'required', 'disabled', 'value-type', 'locale', 'format', 'temporal',
            'decimal-separator', 'group-separator', 'max-fraction-digits',
            'fraction-digits', 'excess-precision'
        ];
    }

    constructor() {
        super();
        this._suppress = false;
        this._dirty = false;
        this._holdRaw = false;
        this._queuedExternal = false;
        this._focused = false;
        /** @type {{ status: string, value: unknown, errors: object[] }} */
        this._state = { status: 'empty', value: null, errors: [] };
    }

    onConnect() {
        this.render();
    }

    /**
     * @param {string} name
     * @param {string|null} oldValue
     * @param {string|null} newValue
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (this._suppress) {
            return;
        }
        super.attributeChangedCallback(name, oldValue, newValue);
    }

    /**
     * @param {string} name
     */
    _handleAttributeChange(name) {
        if (name === 'value') {
            if (this._isControlFocused()) {
                this._queuedExternal = true;
                return;
            }
            this._queuedExternal = false;
            this._dirty = false;
            this._holdRaw = false;
            this._syncFromAttribute();
            return;
        }
        if ([
            'value-type', 'locale', 'format', 'temporal', 'decimal-separator',
            'group-separator', 'max-fraction-digits', 'fraction-digits', 'excess-precision'
        ].includes(name)) {
            if (!this._holdRaw && !this._isControlFocused()) {
                this._syncFromAttribute();
            }
            this._syncInputMode();
            return;
        }
        super._handleAttributeChange(name);
        this._syncFeedback(this._state.status === 'invalid');
    }

    _getControl() {
        return this.querySelector('[data-core-formatted-input]');
    }

    ui_render() {
        const field = this.createFieldShell();
        field.classList.add('core-formatted-field');
        this.appendLabel(field);
        field.appendChild(createElement('input', {
            className: `core-control${this.hasError ? ' core-control--error' : ''}`,
            attrs: {
                type: 'text',
                id: this.fieldId,
                'data-core-formatted-input': true,
                autocomplete: 'off',
                spellcheck: 'false'
            }
        }));
        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
    }

    ui_toFunctional() {
        const input = this._getControl();
        this.wireControl(input);
        this._syncInputMode();
        this._bindFocusTracking(input);
        this.bindDelegated('input', '[data-core-formatted-input]', () => this._onInput());
        this.bindDelegated('focusout', '[data-core-formatted-input]', (event) => this._onFocusOut(event));
        this._syncFromAttribute();
    }

    /**
     * Track focus events. Some documents do not update activeElement from focus().
     * @param {HTMLInputElement|null} input
     */
    _bindFocusTracking(input) {
        this._focusAbort?.abort();
        this._focusAbort = new AbortController();
        if (!input) {
            return;
        }
        const signal = this._focusAbort.signal;
        input.addEventListener('focus', () => {
            this._focused = true;
        }, { signal });
        input.addEventListener('focusout', () => {
            this._focused = false;
        }, { signal });
    }

    _isControlFocused() {
        const input = this._getControl();
        return Boolean(input) && (this._focused || document.activeElement === input);
    }

    cleanFunctional() {
        this._focusAbort?.abort();
        this._focusAbort = null;
        this._focused = false;
        super.cleanFunctional();
    }

    _syncInputMode() {
        const input = this._getControl();
        if (!input) {
            return;
        }
        const { type } = readFormattedOptions(this);
        input.setAttribute('inputmode', type === 'integer' || type === 'decimal' ? 'decimal' : 'text');
        input.setAttribute('type', 'text');
    }

    _syncFromAttribute() {
        const input = this._getControl();
        if (!input || this._holdRaw) {
            return;
        }
        if (this._isControlFocused() && this._dirty) {
            return;
        }
        const { type, options } = readFormattedOptions(this);
        const rawAttr = this.hasAttribute('value') ? (this.getAttribute('value') || '') : '';
        if (rawAttr === '') {
            input.value = '';
            this._state = { status: 'empty', value: null, errors: [] };
            this._syncFeedback(false);
            return;
        }
        const parsed = parseValue(type, rawAttr, { ...options, source: 'canonical' });
        this._state = parsed;
        input.value = parsed.status === 'valid'
            ? formatValue(type, parsed.value, options)
            : rawAttr;
        this._syncFeedback(parsed.status === 'invalid');
    }

    _onInput() {
        this._dirty = true;
        this._holdRaw = true;
        const input = this._getControl();
        const { type, options } = readFormattedOptions(this);
        this._state = parseValue(type, input ? input.value : '', { ...options, source: 'localized' });
        this._emit('core-formatted-field-input');
    }

    /**
     * @param {Event} event
     */
    _onFocusOut(event) {
        if (event.target !== this._getControl()) {
            return;
        }
        if (!this._dirty) {
            if (this._queuedExternal) {
                this._queuedExternal = false;
                this._holdRaw = false;
                this._syncFromAttribute();
            }
            return;
        }
        this._queuedExternal = false;
        this._dirty = false;
        const input = this._getControl();
        const raw = input ? input.value : '';
        const { type, options } = readFormattedOptions(this);
        let parsed = parseValue(type, raw, { ...options, source: 'localized' });
        if (this.required && parsed.status === 'empty') {
            parsed = {
                status: 'invalid',
                value: null,
                errors: [{ code: 'E_REQUIRED', message: 'This field is required.' }]
            };
        }
        this._state = parsed;
        if (parsed.status === 'valid') {
            this._holdRaw = false;
            const serialized = serializeCanonical(type, parsed.value);
            this._suppress = true;
            if (this.getAttribute('value') !== serialized) {
                this.setAttribute('value', serialized);
            }
            this._suppress = false;
            if (input) {
                input.value = formatValue(type, parsed.value, options);
            }
        } else {
            this._holdRaw = true;
            this._suppress = true;
            if (this.hasAttribute('value')) {
                this.removeAttribute('value');
            }
            this._suppress = false;
        }
        this._syncFeedback(parsed.status === 'invalid');
        this._emit('core-formatted-field-change');
    }

    _syncFeedback(showInvalid) {
        const field = this._getFieldShell();
        const control = this._getControl();
        if (!field) {
            return;
        }
        let note = field.querySelector(':scope > [data-core-parse-error]');
        const message = showInvalid && !this.hasError
            ? (this._state.errors[0]?.message || 'Invalid value.')
            : '';
        if (message) {
            if (!note) {
                note = createElement('p', {
                    className: 'core-error-text',
                    text: message,
                    attrs: {
                        id: `${this.fieldId}-parse-error`,
                        'data-core-parse-error': true,
                        role: 'alert'
                    }
                });
                field.appendChild(note);
            } else {
                note.id = `${this.fieldId}-parse-error`;
                note.textContent = message;
            }
        } else if (note) {
            note.remove();
        }
        if (!control) {
            return;
        }
        const invalid = this.hasError || Boolean(message);
        control.classList.toggle('core-control--error', invalid);
        if (this.hasError) {
            control.setAttribute('aria-invalid', 'true');
        } else if (message && note) {
            control.setAttribute('aria-invalid', 'true');
            control.setAttribute('aria-describedby', note.id);
        } else {
            control.removeAttribute('aria-invalid');
            if (control.getAttribute('aria-describedby') === `${this.fieldId}-parse-error`) {
                if (this.hint) {
                    control.setAttribute('aria-describedby', `${this.fieldId}-hint`);
                } else {
                    control.removeAttribute('aria-describedby');
                }
            }
        }
    }

    /**
     * @returns {{ value: unknown, rawValue: string, status: string, errors: object[] }}
     */
    getValueState() {
        return {
            value: this._state.value,
            rawValue: this._getControl()?.value ?? '',
            status: this._state.status,
            errors: this._state.errors
        };
    }

    /**
     * @param {string} name
     */
    _emit(name) {
        this.dispatchEvent(new CustomEvent(name, {
            bubbles: true,
            detail: this.getValueState()
        }));
    }
}

registerCoreComponent('core-formatted-field', CoreFormattedField);
