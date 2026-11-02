import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import {
    compareValues,
    formatValue,
    parseValue,
    readFormattedOptions
} from '../../lib/formatted/formatted-options.js';

/**
 * Two formatted bounds. A single bound is valid. Both bounds must respect min <= max.
 * Not a slider and not a calendar.
 *
 * Events: `core-range-field-input`, `core-range-field-change`.
 * Programmatic `value` updates do not emit.
 */
export class CoreRangeField extends Core_UXFormControl {

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
        this._queuedExternal = false;
        this._focusedBounds = 0;
        /** @type {{ min: boolean, max: boolean }} */
        this._dirty = { min: false, max: false };
        /** @type {{ status: string, value: { min: unknown, max: unknown }|null, errors: object[] }} */
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
        if ([
            'value', 'value-type', 'locale', 'format', 'temporal',
            'decimal-separator', 'group-separator', 'max-fraction-digits',
            'fraction-digits', 'excess-precision'
        ].includes(name)) {
            if (name === 'value' && this._isBoundsFocused()) {
                this._queuedExternal = true;
                return;
            }
            if (!this._isBoundsFocused()) {
                this._queuedExternal = false;
                this._dirty = { min: false, max: false };
                this._syncFromAttribute();
            }
            this._syncBoundAttributes();
            return;
        }
        if (name === 'disabled' || name === 'required' || name === 'name' || name === 'placeholder') {
            this._syncBoundAttributes();
            return;
        }
        super._handleAttributeChange(name);
        if (name === 'label' || name === 'input-id') {
            this._syncGroupLabel();
        }
        this._syncFeedback(this._state.status === 'invalid');
    }

    /**
     * @param {'min'|'max'} bound
     * @returns {HTMLInputElement|null}
     */
    _bound(bound) {
        const node = this.querySelector(`[data-bound="${bound}"]`);
        return node instanceof HTMLInputElement ? node : null;
    }

    _isBoundsFocused() {
        const active = document.activeElement;
        return this._focusedBounds > 0 || active === this._bound('min') || active === this._bound('max');
    }

    _bindFocusTracking() {
        this._focusAbort?.abort();
        this._focusAbort = new AbortController();
        const signal = this._focusAbort.signal;
        ['min', 'max'].forEach((bound) => {
            const input = this._bound(/** @type {'min'|'max'} */ (bound));
            if (!input) {
                return;
            }
            input.addEventListener('focus', () => {
                this._focusedBounds += 1;
            }, { signal });
            input.addEventListener('focusout', () => {
                this._focusedBounds = Math.max(0, this._focusedBounds - 1);
            }, { signal });
        });
    }

    cleanFunctional() {
        this._focusAbort?.abort();
        this._focusAbort = null;
        this._focusedBounds = 0;
        super.cleanFunctional();
    }

    ui_render() {
        const field = this.createFieldShell();
        field.classList.add('core-range-field');
        this.appendLabel(field);
        const bounds = createElement('div', {
            className: 'core-range-field__bounds',
            attrs: { role: 'group' }
        });
        bounds.appendChild(this._createBound('min', 'Minimum'));
        bounds.appendChild(createElement('span', {
            className: 'core-range-field__sep',
            text: '–',
            attrs: { 'aria-hidden': 'true' }
        }));
        bounds.appendChild(this._createBound('max', 'Maximum'));
        field.appendChild(bounds);
        this._syncGroupLabel(field);
        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
    }

    /**
     * @param {'min'|'max'} bound
     * @param {string} accessibleName
     * @returns {HTMLInputElement}
     */
    _createBound(bound, accessibleName) {
        return /** @type {HTMLInputElement} */ (createElement('input', {
            className: `core-control core-range-field__bound${this.hasError ? ' core-control--error' : ''}`,
            attrs: {
                type: 'text',
                'data-bound': bound,
                'aria-label': accessibleName,
                autocomplete: 'off',
                spellcheck: 'false',
                inputmode: 'decimal'
            }
        }));
    }

    /**
     * @param {HTMLElement|null} [field]
     */
    _syncGroupLabel(field = this._getFieldShell()) {
        const label = field?.querySelector(':scope > label.core-label') || null;
        const bounds = field?.querySelector('.core-range-field__bounds');
        if (label) {
            label.id = `${this.fieldId}-label`;
            label.removeAttribute('for');
            if (this.label) {
                label.className = `core-label${this.required ? ' core-label--required' : ''}`;
            }
            bounds?.setAttribute('aria-labelledby', label.id);
        } else {
            bounds?.removeAttribute('aria-labelledby');
        }
    }

    ui_toFunctional() {
        this._syncGroupLabel();
        this._syncBoundAttributes();
        this._bindFocusTracking();
        this.bindDelegated('input', '[data-bound]', (event, match) => this._onInput(match));
        this.bindDelegated('focusout', '[data-bound]', (event, match) => this._onFocusOut(match));
        this._syncFromAttribute();
    }

    _syncBoundAttributes() {
        const { type } = readFormattedOptions(this);
        const inputMode = type === 'integer' || type === 'decimal' ? 'decimal' : 'text';
        ['min', 'max'].forEach((bound) => {
            const input = this._bound(/** @type {'min'|'max'} */ (bound));
            if (!input) {
                return;
            }
            input.disabled = this.disabled;
            input.required = false;
            input.setAttribute('type', 'text');
            input.setAttribute('inputmode', inputMode);
            if (this.hasAttribute('placeholder')) {
                input.setAttribute('placeholder', this.getAttribute('placeholder') || '');
            } else {
                input.removeAttribute('placeholder');
            }
            if (this.hasAttribute('name')) {
                input.name = `${this.getAttribute('name')}-${bound}`;
            } else {
                input.removeAttribute('name');
            }
        });
    }

    /**
     * @param {boolean} [force]
     */
    _syncFromAttribute(force = false) {
        if (!force && this._isBoundsFocused()) {
            return;
        }
        const { type, options } = readFormattedOptions(this);
        const rawAttr = this.hasAttribute('value') ? (this.getAttribute('value') || '') : '';
        if (rawAttr === '') {
            this._state = { status: 'empty', value: null, errors: [] };
            this._showBound('min', '');
            this._showBound('max', '');
            this._syncFeedback(false);
            return;
        }
        let source = rawAttr;
        try {
            source = JSON.parse(rawAttr);
        } catch {
            source = rawAttr;
        }
        const minValue = source && typeof source === 'object' ? source.min : null;
        const maxValue = source && typeof source === 'object' ? source.max : null;
        const canonicalOptions = { ...options, source: 'canonical' };
        this._showBound('min', minValue == null || minValue === ''
            ? ''
            : formatValue(type, parseValue(type, minValue, canonicalOptions).value ?? minValue, options));
        this._showBound('max', maxValue == null || maxValue === ''
            ? ''
            : formatValue(type, parseValue(type, maxValue, canonicalOptions).value ?? maxValue, options));
        this._state = this._evaluate(false);
        this._syncFeedback(this._state.status === 'invalid');
    }

    /**
     * @param {'min'|'max'} bound
     * @param {string} text
     */
    _showBound(bound, text) {
        const input = this._bound(bound);
        if (input && input.value !== text) {
            input.value = text;
        }
    }

    /**
     * @param {boolean} preserveInvalidRaw
     * @returns {{ status: string, value: { min: unknown, max: unknown }|null, errors: object[] }}
     */
    _evaluate(preserveInvalidRaw) {
        const { type, options } = readFormattedOptions(this);
        const typed = { ...options, source: 'localized' };
        const minParsed = parseValue(type, this._bound('min')?.value ?? '', typed);
        const maxParsed = parseValue(type, this._bound('max')?.value ?? '', typed);
        if (minParsed.status === 'invalid' || maxParsed.status === 'invalid') {
            return {
                status: 'invalid',
                value: null,
                errors: [...minParsed.errors, ...maxParsed.errors]
            };
        }
        if (minParsed.status === 'pending' || maxParsed.status === 'pending') {
            return { status: 'pending', value: null, errors: [] };
        }
        if (minParsed.status === 'empty' && maxParsed.status === 'empty') {
            if (this.required && preserveInvalidRaw) {
                return {
                    status: 'invalid',
                    value: null,
                    errors: [{ code: 'E_REQUIRED', message: 'This field is required.' }]
                };
            }
            return { status: 'empty', value: null, errors: [] };
        }
        const value = {
            min: minParsed.status === 'valid' ? minParsed.value : null,
            max: maxParsed.status === 'valid' ? maxParsed.value : null
        };
        if (value.min != null && value.max != null) {
            const order = compareValues(type, value.min, value.max, options);
            if (order != null && order > 0) {
                return {
                    status: 'invalid',
                    value: null,
                    errors: [{
                        code: 'E_RANGE_ORDER',
                        message: 'Minimum is greater than maximum.',
                        details: { exact: value }
                    }]
                };
            }
        }
        return { status: 'valid', value, errors: [] };
    }

    /**
     * @param {Element} match
     */
    _onInput(match) {
        const bound = match.getAttribute('data-bound') === 'max' ? 'max' : 'min';
        this._dirty[bound] = true;
        this._state = this._evaluate(false);
        this._emit('core-range-field-input');
    }

    /**
     * @param {Element} match
     */
    _onFocusOut(match) {
        const bound = match.getAttribute('data-bound') === 'max' ? 'max' : 'min';
        if (!this._dirty[bound]) {
            if (this._queuedExternal) {
                this._queuedExternal = false;
                this._syncFromAttribute(true);
            }
            return;
        }
        this._queuedExternal = false;
        this._dirty[bound] = false;
        const { type, options } = readFormattedOptions(this);
        this._state = this._evaluate(true);
        if (this._state.status === 'valid' && this._state.value) {
            this._suppress = true;
            const serialized = JSON.stringify(this._state.value);
            if (this.getAttribute('value') !== serialized) {
                this.setAttribute('value', serialized);
            }
            this._suppress = false;
            this._showBound('min', this._state.value.min == null
                ? ''
                : formatValue(type, this._state.value.min, options));
            this._showBound('max', this._state.value.max == null
                ? ''
                : formatValue(type, this._state.value.max, options));
        } else {
            this._suppress = true;
            if (this.hasAttribute('value')) {
                this.removeAttribute('value');
            }
            this._suppress = false;
        }
        this._syncFeedback(this._state.status === 'invalid');
        this._emit('core-range-field-change');
    }

    /**
     * @param {boolean} showInvalid
     */
    _syncFeedback(showInvalid) {
        const field = this._getFieldShell();
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
        const invalid = this.hasError || Boolean(message);
        const describedBy = this.hasError
            ? `${this.fieldId}-error`
            : (message ? `${this.fieldId}-parse-error` : (this.hint ? `${this.fieldId}-hint` : ''));
        ['min', 'max'].forEach((bound) => {
            const input = this._bound(/** @type {'min'|'max'} */ (bound));
            if (!input) {
                return;
            }
            input.classList.toggle('core-control--error', invalid);
            if (invalid) {
                input.setAttribute('aria-invalid', 'true');
            } else {
                input.removeAttribute('aria-invalid');
            }
            if (describedBy) {
                input.setAttribute('aria-describedby', describedBy);
            } else {
                input.removeAttribute('aria-describedby');
            }
        });
    }

    /**
     * @returns {{ value: unknown, rawValue: { min: string, max: string }, status: string, errors: object[] }}
     */
    getValueState() {
        return {
            value: this._state.value,
            rawValue: {
                min: this._bound('min')?.value ?? '',
                max: this._bound('max')?.value ?? ''
            },
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

registerCoreComponent('core-range-field', CoreRangeField);
