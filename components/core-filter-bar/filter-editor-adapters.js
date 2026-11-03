/**
 * Ports from filter instances to existing CORE_UX editors.
 * Programmatic mount and update do not emit a value change.
 * A search widget keeps its own delay; the editor channel itself is not debounced.
 */
import { Observable } from 'rxjs';
import { operatorCardinality } from 'CORE_JS/lib/value/core-value-registry.js';
import '../core-field/core-field.js';
import '../core-formatted-field/core-formatted-field.js';
import '../core-range-field/core-range-field.js';
import '../core-select/core-select.js';
import '../core-multi-select/core-multi-select.js';
import '../core-autocomplete/core-autocomplete.js';
import '../core-autocomplete-chips/core-autocomplete-chips.js';

/** @type {Record<string, string>} */
const OPERATOR_LABELS = {
    eq: 'Equals',
    neq: 'Not equal',
    contains: 'Contains',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    isEmpty: 'Is empty',
    isNotEmpty: 'Is not empty',
    gt: 'Greater than',
    gte: 'Greater or equal',
    lt: 'Less than',
    lte: 'Less or equal',
    before: 'Before',
    after: 'After',
    between: 'Between',
    outside: 'Outside',
    in: 'In',
    notIn: 'Not in',
    containsAny: 'Contains any',
    containsAll: 'Contains all',
};

/** @type {Record<string, string>} */
const FORMATTED_TYPE_ATTR = {
    integer: 'integer',
    decimal: 'decimal',
    date: 'date',
    time: 'time',
    datetime: 'datetime',
    relativeDate: 'relative-date',
};

/**
 * @param {string} operator
 * @returns {string}
 */
export function operatorLabel(operator) {
    return OPERATOR_LABELS[operator] || operator;
}

/**
 * @param {string} operator
 * @returns {boolean}
 */
export function operatorTakesValue(operator) {
    return operatorCardinality(operator) !== 'none';
}

/**
 * @param {object} definition
 * @param {string} operator
 * @param {{ editors?: Record<string, Function> }} [registry]
 * @returns {{ mount: Function, update: Function, focus: Function, destroy: Function }}
 */
export function createFilterEditor(definition, operator, registry) {
    const factory = definition?.editorRef ? registry?.editors?.[definition.editorRef] : null;
    if (typeof factory === 'function') {
        const port = factory(definition);
        if (port && typeof port.mount === 'function' && typeof port.update === 'function'
            && typeof port.focus === 'function' && typeof port.destroy === 'function') {
            return port;
        }
    }
    return new FilterValueEditor(resolveKind(definition, operator));
}

/**
 * @param {object} definition
 * @param {string} operator
 * @returns {string}
 */
function resolveKind(definition, operator) {
    const card = operatorCardinality(operator);
    if (card === 'none') {
        return 'none';
    }
    if (card === 'range') {
        return 'range';
    }
    const editor = typeof definition?.editor === 'string' ? definition.editor : 'text';
    if (card === 'list') {
        if (editor === 'treeSelect') {
            return 'treeSelect';
        }
        if (editor === 'multiSelect' || editor === 'select') {
            return 'multiSelect';
        }
        return 'tags';
    }
    if (editor === 'formatted' || editor === 'boolean' || editor === 'select'
        || editor === 'autocomplete' || editor === 'text' || editor === 'range') {
        return editor;
    }
    return 'custom';
}

class FilterValueEditor {

    /**
     * @param {string} kind
     */
    constructor(kind) {
        this.kind = kind;
        this._dead = false;
        this._silent = false;
        /** @type {HTMLElement|null} */
        this._host = null;
        /** @type {HTMLElement|null} */
        this._widget = null;
        /** @type {HTMLElement|null} */
        this._hint = null;
        /** @type {((change: object) => void)|null} */
        this._onChange = null;
        /** @type {object|null} */
        this._context = null;
        /** @type {AbortController|null} */
        this._abort = null;
        this._seq = 0;
        this._dependency = '';
        /** @type {object[]} */
        this._options = [];
    }

    /**
     * @param {HTMLElement} host
     * @param {object} context
     * @param {(change: object) => void} onChange
     */
    mount(host, context, onChange) {
        this._host = host;
        this._onChange = onChange;
        this._context = context;
        this._dependency = context.dependencyKey || '';
        this._provider = context.provider;
        host.replaceChildren();
        if (this.kind === 'none') {
            return;
        }
        if (this.kind === 'custom') {
            const note = document.createElement('p');
            note.className = 'core-filter-bar__hint';
            note.textContent = 'This editor is not registered.';
            host.append(note);
            return;
        }
        this._hint = document.createElement('p');
        this._hint.className = 'core-filter-bar__hint';
        this._hint.hidden = true;
        this._widget = this._createWidget(context);
        host.append(this._widget, this._hint);
        this._bind(context);
        this._writeValue();
        this._reload(true);
    }

    /**
     * @param {object} context
     */
    update(context) {
        if (this._dead) {
            return;
        }
        const providerChanged = context.provider !== this._provider;
        this._provider = context.provider;
        this._context = context;
        if (!this._widget) {
            return;
        }
        this._syncDisabled();
        this._nameControl(context.label || 'Filter value');
        this._writeValue();
        if (providerChanged || (context.dependencyKey || '') !== this._dependency) {
            this._dependency = context.dependencyKey || '';
            this._reload(false);
        }
    }

    focus() {
        const control = this._control();
        control?.focus();
    }

    destroy() {
        this._dead = true;
        this._seq += 1;
        this._abort?.abort();
        this._abort = null;
        this._widget = null;
        this._onChange = null;
        this._host?.replaceChildren();
    }

    /**
     * @param {object} context
     * @returns {HTMLElement}
     */
    _createWidget(context) {
        const label = context.label || 'Filter value';
        if (this.kind === 'text') {
            const field = document.createElement('core-field');
            field.setAttribute('type', context.type === 'email' ? 'email' : 'text');
            field.setAttribute('label', '');
            return field;
        }
        if (this.kind === 'formatted' || this.kind === 'range') {
            const field = document.createElement(this.kind === 'range' ? 'core-range-field' : 'core-formatted-field');
            applyFormat(field, context);
            field.setAttribute('label', '');
            return field;
        }
        if (this.kind === 'boolean' || this.kind === 'select') {
            const field = document.createElement('core-select');
            field.setAttribute('label', '');
            return field;
        }
        if (this.kind === 'multiSelect') {
            const field = document.createElement('core-multi-select');
            field.setAttribute('label', '');
            field.setAttribute('placeholder', label);
            return field;
        }
        if (this.kind === 'autocomplete') {
            const field = document.createElement('core-autocomplete');
            field.setAttribute('label', label);
            field.setAttribute('placeholder', 'Type to search');
            return field;
        }
        if (this.kind === 'tags') {
            const field = document.createElement('core-autocomplete-chips');
            field.setAttribute('label', label);
            field.setAttribute('allow-additions', 'true');
            field.setAttribute('placeholder', 'Add a value');
            return field;
        }
        const tree = document.createElement('div');
        tree.className = 'core-filter-bar__tree';
        tree.setAttribute('role', 'group');
        tree.setAttribute('aria-label', label);
        return tree;
    }

    /**
     * @param {object} context
     */
    _bind(context) {
        const widget = this._widget;
        if (!widget) {
            return;
        }
        if (this.kind === 'text') {
            widget.addEventListener('input', () => this._emitText());
            widget.addEventListener('focusout', () => this._emitText());
        } else if (this.kind === 'formatted') {
            widget.addEventListener('core-formatted-field-input', (event) => this._emitWidget(event));
            widget.addEventListener('core-formatted-field-change', (event) => this._emitWidget(event));
        } else if (this.kind === 'range') {
            widget.addEventListener('core-range-field-input', (event) => this._emitWidget(event));
            widget.addEventListener('core-range-field-change', (event) => this._emitWidget(event));
        } else if (this.kind === 'boolean' || this.kind === 'select') {
            widget.addEventListener('change', () => this._emitSelect());
        } else if (this.kind === 'multiSelect') {
            widget.addEventListener('multiselect-change', () => this._emitList());
        } else if (this.kind === 'tags') {
            widget.addEventListener('chips-change', () => this._emitList());
        } else if (this.kind === 'autocomplete') {
            widget.addEventListener('autocomplete-change', (event) => this._emitQuery(event));
            widget.addEventListener('autocomplete-select', (event) => this._emitPick(event));
        }
        this._nameControl(context.label || 'Filter value');
        this._syncDisabled();
        if (this.kind === 'autocomplete' || this.kind === 'tags') {
            const provider = context.provider;
            if (typeof provider === 'function') {
                widget.setDataSource((query) => this._search(provider, query));
            } else {
                widget.setDataSource(toResults(context.options));
            }
        }
    }

    /**
     * @param {string} label
     */
    _nameControl(label) {
        const control = this._control();
        if (!control || control.getAttribute('aria-label') === label) {
            return;
        }
        control.setAttribute('aria-label', label);
    }

    /**
     * Static options come from the definition. A provider owns `_options` instead,
     * so a later definition update is not hidden behind the previous list.
     * @returns {unknown}
     */
    _choiceList() {
        if (typeof this._context?.provider === 'function') {
            return this._options;
        }
        return this._context?.options;
    }

    /**
     * @returns {HTMLElement|null}
     */
    _control() {
        const widget = this._widget;
        if (!widget) {
            return null;
        }
        if (this.kind === 'treeSelect') {
            return widget.querySelector('input');
        }
        return widget.querySelector('input, select, textarea') || widget;
    }

    _syncDisabled() {
        const widget = this._widget;
        if (!widget || this.kind === 'treeSelect') {
            return;
        }
        if (this._context?.disabled) {
            widget.setAttribute('disabled', '');
        } else {
            widget.removeAttribute('disabled');
        }
    }

    _writeValue() {
        if (!this._widget || !this._context) {
            return;
        }
        this._silent = true;
        try {
            if (this.kind === 'text' || this.kind === 'formatted' || this.kind === 'range') {
                const shown = displayValue(this.kind, this._context);
                writeAttribute(this._widget, 'value', shown);
                const fields = this.kind === 'text'
                    ? [...this._widget.querySelectorAll('input')].slice(0, 1)
                    : (shown === '' ? [...this._widget.querySelectorAll('input, textarea')] : []);
                for (const field of fields) {
                    if (field.value !== shown) {
                        field.value = shown;
                    }
                }
            } else if (this.kind === 'boolean') {
                this._writeBooleanOptions();
            } else if (this.kind === 'select') {
                this._writeSelectOptions(this._choiceList());
            } else if (this.kind === 'multiSelect') {
                this._writeMultiOptions(this._choiceList());
            } else if (this.kind === 'autocomplete') {
                const instance = this._context.instance;
                const text = instance.status === 'valid'
                    ? (instance.selectedLabel || (typeof instance.value === 'string' ? instance.value : ''))
                    : (instance.rawValue == null ? '' : String(instance.rawValue));
                this._widget.setValue(text);
            } else if (this.kind === 'tags') {
                const value = Array.isArray(this._context.instance.value) ? this._context.instance.value : [];
                this._widget.setSelected(value.filter((item) => typeof item === 'string'));
            } else if (this.kind === 'treeSelect') {
                this._writeTree(this._options.length ? this._options : (this._context.nodes || this._context.options));
            }
        } finally {
            this._silent = false;
        }
    }

    _writeBooleanOptions() {
        const value = this._context.instance.value;
        const current = value === true ? 'true' : (value === false ? 'false' : '');
        const payload = JSON.stringify([
            { value: '', label: '—', selected: current === '' },
            { value: 'true', label: 'Yes', selected: current === 'true' },
            { value: 'false', label: 'No', selected: current === 'false' },
        ]);
        clearNativeSelect(this._widget);
        writeAttribute(this._widget, 'options', payload);
        applyNativeSelect(this._widget, current);
    }

    /**
     * @param {unknown} options
     */
    _writeSelectOptions(options) {
        const list = withCurrent(normalizeList(options), this._context.instance);
        this._options = list;
        const blank = list.some((item) => item.value === '') ? [] : [{ value: '', label: '—' }];
        const current = this._context.instance.value;
        const payload = JSON.stringify([...blank, ...list.map((item) => ({
            value: item.value,
            label: item.label,
            selected: item.value === current,
        }))]);
        clearNativeSelect(this._widget);
        writeAttribute(this._widget, 'options', payload);
        applyNativeSelect(this._widget, typeof current === 'string' ? current : '');
    }

    /**
     * @param {unknown} options
     */
    _writeMultiOptions(options) {
        const list = withCurrent(normalizeList(options), this._context.instance);
        this._options = list;
        const payload = list.map((item) => ({ value: item.value, label: item.label }));
        const optionsKey = JSON.stringify(payload);
        if (optionsKey !== this._multiOptionsKey) {
            this._multiOptionsKey = optionsKey;
            this._widget.setOptions(payload);
        }
        const value = Array.isArray(this._context.instance.value) ? this._context.instance.value : [];
        const selected = value.filter((item) => typeof item === 'string' || typeof item === 'boolean');
        const selectedKey = JSON.stringify(selected);
        if (selectedKey !== this._multiSelectedKey) {
            this._multiSelectedKey = selectedKey;
            this._widget.setSelected(selected);
        }
    }

    /**
     * @param {unknown} nodes
     */
    _writeTree(nodes) {
        const selected = new Set(
            (Array.isArray(this._context.instance.value) ? this._context.instance.value : [])
                .filter((item) => typeof item === 'string')
        );
        const tree = treeNodes(nodes);
        this._widget.replaceChildren();
        this._widget.append(renderTree(tree, selected, (value, checked) => {
            if (this._silent || this._dead) {
                return;
            }
            if (checked) {
                selected.add(value);
            } else {
                selected.delete(value);
            }
            this._emitValues([...selected]);
        }));
    }

    /**
     * @param {boolean} force
     */
    _reload(force) {
        if (this._dead || !this._context) {
            return;
        }
        if (this.kind === 'autocomplete') {
            if (!force) {
                const query = this._widget?.getValue?.() || '';
                if (query && typeof this._widget.performSearch === 'function') {
                    this._widget.performSearch(query);
                }
            }
            return;
        }
        if (this.kind !== 'select' && this.kind !== 'multiSelect' && this.kind !== 'treeSelect' && this.kind !== 'tags') {
            return;
        }
        const provider = this._context.provider;
        if (typeof provider !== 'function') {
            this._setHint('', false);
            if (this.kind === 'treeSelect') {
                this._writeTree(this._context.nodes || this._context.options);
            }
            return;
        }
        const seq = ++this._seq;
        this._abort?.abort();
        const ctrl = new AbortController();
        this._abort = ctrl;
        this._setHint('Loading options', true);
        Promise.resolve()
            .then(() => provider({
                instanceId: this._context.instance.instanceId,
                query: '',
                filters: this._context.filters || [],
                signal: ctrl.signal,
            }))
            .then((options) => {
                if (this._dead || seq !== this._seq || ctrl.signal.aborted) {
                    return;
                }
                this._setHint('', false);
                this._silent = true;
                try {
                    if (this.kind === 'tags') {
                        this._widget.setDataSource(toResults(options));
                        this._writeValue();
                    } else if (this.kind === 'treeSelect') {
                        this._options = normalizeList(options);
                        this._writeTree(options);
                    } else if (this.kind === 'multiSelect') {
                        this._writeMultiOptions(options);
                    } else {
                        this._writeSelectOptions(options);
                    }
                } finally {
                    this._silent = false;
                }
            })
            .catch((error) => {
                if (this._dead || seq !== this._seq || ctrl.signal.aborted || error?.name === 'AbortError') {
                    return;
                }
                this._setHint('Options could not be loaded.', false);
            });
    }

    /**
     * @param {Function} provider
     * @param {string} query
     * @returns {Observable<unknown>}
     */
    _search(provider, query) {
        return new Observable((subscriber) => {
            const ctrl = new AbortController();
            let active = true;
            const context = this._context;
            Promise.resolve()
                .then(() => provider({
                    instanceId: context?.instance?.instanceId || '',
                    query: query || '',
                    filters: context?.filters || [],
                    signal: ctrl.signal,
                }))
                .then((options) => {
                    if (!active || ctrl.signal.aborted) {
                        subscriber.complete();
                        return;
                    }
                    subscriber.next(toResults(options));
                    subscriber.complete();
                })
                .catch((error) => {
                    if (!active || ctrl.signal.aborted || error?.name === 'AbortError') {
                        subscriber.complete();
                        return;
                    }
                    subscriber.error(error);
                });
            return () => {
                active = false;
                ctrl.abort();
            };
        });
    }

    /**
     * @param {string} text
     * @param {boolean} busy
     */
    _setHint(text, busy) {
        if (!this._hint) {
            return;
        }
        this._hint.textContent = text;
        this._hint.hidden = text === '';
        if (busy) {
            this._hint.setAttribute('data-core-filter-loading', '');
        } else {
            this._hint.removeAttribute('data-core-filter-loading');
        }
    }

    /**
     * @param {object} change
     */
    _emit(change) {
        if (this._silent || this._dead || !this._onChange) {
            return;
        }
        this._onChange(change);
    }

    _emitText() {
        const input = this._widget?.querySelector('input');
        const raw = input ? input.value : '';
        if (raw === '') {
            this._emit({ status: 'empty', value: null, rawValue: '', touched: true, errors: [] });
            return;
        }
        this._emit({ status: 'valid', value: raw, touched: true, errors: [] });
    }

    /**
     * @param {Event} event
     */
    _emitWidget(event) {
        const detail = /** @type {CustomEvent} */ (event).detail || {};
        const status = detail.status || 'invalid';
        /** @type {Record<string, unknown>} */
        const change = {
            status,
            value: status === 'valid' ? detail.value : null,
            touched: true,
            errors: Array.isArray(detail.errors) ? detail.errors : [],
        };
        if (status !== 'valid') {
            change.rawValue = detail.rawValue;
        }
        this._emit(change);
    }

    _emitSelect() {
        const select = this._widget?.querySelector('select');
        const raw = select ? select.value : '';
        if (this.kind === 'boolean') {
            if (raw === 'true' || raw === 'false') {
                this._emit({ status: 'valid', value: raw === 'true', touched: true, errors: [] });
            } else {
                this._emit({ status: 'empty', value: null, rawValue: '', touched: true, errors: [] });
            }
            return;
        }
        if (raw === '') {
            this._emit({ status: 'empty', value: null, rawValue: '', touched: true, errors: [] });
            return;
        }
        const option = this._options.find((item) => String(item.value) === raw);
        if (!option || (typeof option.value !== 'string' && typeof option.value !== 'boolean')) {
            this._emit({
                status: 'invalid',
                value: null,
                rawValue: raw,
                touched: true,
                errors: [{ code: 'E_INVALID_SHAPE', message: 'Option value must be a string or a boolean.' }],
            });
            return;
        }
        this._emit({
            status: 'valid',
            value: option.value,
            selectedLabel: option.label,
            touched: true,
            errors: [],
        });
    }

    _emitList() {
        const values = typeof this._widget?.getSelectedValues === 'function'
            ? this._widget.getSelectedValues()
            : [];
        this._emitValues(values);
    }

    /**
     * @param {unknown[]} values
     */
    _emitValues(values) {
        if (!Array.isArray(values) || values.some((item) => typeof item !== 'string' && typeof item !== 'boolean')) {
            this._emit({
                status: 'invalid',
                value: null,
                rawValue: values,
                touched: true,
                errors: [{ code: 'E_INVALID_SHAPE', message: 'Expected a list of strings or booleans.' }],
            });
            return;
        }
        if (values.length === 0) {
            this._emit({ status: 'empty', value: null, rawValue: [], touched: true, errors: [] });
            return;
        }
        this._emit({ status: 'valid', value: values, touched: true, errors: [] });
    }

    /**
     * @param {Event} event
     */
    _emitQuery(event) {
        const query = /** @type {CustomEvent} */ (event).detail?.query ?? '';
        if (query === '') {
            this._emit({ status: 'empty', value: null, rawValue: '', touched: true, errors: [] });
            return;
        }
        this._emit({ status: 'pending', value: null, rawValue: query, touched: true, errors: [] });
    }

    /**
     * @param {Event} event
     */
    _emitPick(event) {
        const result = /** @type {CustomEvent} */ (event).detail?.result || {};
        const value = result.value;
        const label = typeof result.title === 'string' ? result.title : '';
        if (typeof value !== 'string' && typeof value !== 'boolean') {
            this._emit({
                status: 'invalid',
                value: null,
                rawValue: label,
                selectedLabel: label,
                touched: true,
                errors: [{ code: 'E_INVALID_SHAPE', message: 'Option value must be a string or a boolean.' }],
            });
            return;
        }
        this._emit({
            status: 'valid',
            value,
            selectedLabel: label || (typeof value === 'string' ? value : ''),
            touched: true,
            errors: [],
        });
    }
}

/**
 * core-select keeps the previous option selected when that option is still listed.
 * Clear the selection before rewriting the list, then mark only the engine value.
 * select.value is not assigned: a getter-only property throws and drops the choice.
 * @param {HTMLElement|null} widget
 * @param {string} desired
 */
function applyNativeSelect(widget, desired) {
    const select = widget?.querySelector('select');
    if (!select) {
        return;
    }
    const match = [...select.options].find((option) => option.value === desired);
    if (!match) {
        return;
    }
    match.selected = true;
    match.setAttribute('selected', '');
}

/**
 * @param {HTMLElement|null} widget
 */
function clearNativeSelect(widget) {
    const select = widget?.querySelector('select');
    if (!select) {
        return;
    }
    for (const option of select.options) {
        option.selected = false;
        option.removeAttribute('selected');
    }
}

/**
 * @param {HTMLElement|null} field
 * @param {string} name
 * @param {string} value
 */
function writeAttribute(field, name, value) {
    if (!field) {
        return;
    }
    try {
        if ((field.getAttribute(name) ?? '') !== value || (value === '' && !field.hasAttribute(name))) {
            field.setAttribute(name, value);
        }
    } catch {
        // Some documents expose select.value as read-only. The option list is already in place.
    }
}

/**
 * @param {string} kind
 * @param {object} context
 * @returns {string}
 */
function displayValue(kind, context) {
    const instance = context.instance || {};
    if (instance.rawValue != null && instance.status !== 'valid') {
        if (typeof instance.rawValue === 'string') {
            return instance.rawValue;
        }
        try {
            return JSON.stringify(instance.rawValue);
        } catch {
            return '';
        }
    }
    if (instance.value == null) {
        return '';
    }
    if (kind === 'range' || typeof instance.value === 'object') {
        return JSON.stringify(instance.value);
    }
    return String(instance.value);
}

/**
 * @param {HTMLElement} field
 * @param {object} context
 */
function applyFormat(field, context) {
    const type = context.type === 'range'
        ? (context.editorOptions?.valueType || 'decimal')
        : context.type;
    const attr = FORMATTED_TYPE_ATTR[type];
    if (attr) {
        field.setAttribute('value-type', attr);
    }
    field.setAttribute('locale', context.locale || 'en');
    const format = context.format || {};
    if (typeof format.format === 'string') {
        field.setAttribute('format', format.format);
    }
    if (format.temporal === 'offset' || format.temporal === 'local') {
        field.setAttribute('temporal', format.temporal);
    }
    if (format.decimalSeparator != null) {
        field.setAttribute('decimal-separator', String(format.decimalSeparator));
    }
    if (format.groupSeparator != null) {
        field.setAttribute('group-separator', String(format.groupSeparator));
    }
    if (format.maxFractionDigits != null) {
        field.setAttribute('max-fraction-digits', String(format.maxFractionDigits));
    }
    if (format.fractionDigits != null) {
        field.setAttribute('fraction-digits', String(format.fractionDigits));
    }
    if (format.excessPrecision) {
        field.setAttribute('excess-precision', String(format.excessPrecision));
    }
}

/**
 * @param {unknown} options
 * @returns {{ value: string|boolean, label: string }[]}
 */
function normalizeList(options) {
    if (!Array.isArray(options)) {
        return [];
    }
    /** @type {{ value: string|boolean, label: string }[]} */
    const out = [];
    for (const item of options) {
        if (typeof item === 'string' || typeof item === 'boolean') {
            out.push({
                value: item,
                label: typeof item === 'boolean' ? (item ? 'Yes' : 'No') : item,
            });
            continue;
        }
        if (!item || typeof item !== 'object') {
            continue;
        }
        const record = /** @type {Record<string, unknown>} */ (item);
        if (typeof record.value !== 'string' && typeof record.value !== 'boolean') {
            continue;
        }
        out.push({
            value: record.value,
            label: typeof record.label === 'string' ? record.label : String(record.value),
        });
    }
    return out;
}

/**
 * @param {{ value: string|boolean, label: string }[]} options
 * @param {object} instance
 * @returns {{ value: string|boolean, label: string }[]}
 */
function withCurrent(options, instance) {
    const list = options.slice();
    const values = Array.isArray(instance?.value)
        ? instance.value
        : (instance?.value == null || instance.value === '' ? [] : [instance.value]);
    for (const value of values) {
        if (typeof value !== 'string' && typeof value !== 'boolean') {
            continue;
        }
        if (!list.some((item) => item.value === value)) {
            const label = values.length === 1 && typeof instance.selectedLabel === 'string'
                ? instance.selectedLabel
                : String(value);
            list.push({ value, label });
        }
    }
    return list;
}

/**
 * @param {unknown} options
 * @returns {{ title: string, value: string|boolean }[]}
 */
function toResults(options) {
    return normalizeList(options).map((item) => ({ title: item.label, value: item.value }));
}

/**
 * @param {unknown} nodes
 * @returns {object[]}
 */
function treeNodes(nodes) {
    const list = Array.isArray(nodes) ? nodes : [];
    if (list.some((item) => item && typeof item === 'object' && Array.isArray(/** @type {any} */ (item).children))) {
        return list;
    }
    return normalizeList(list);
}

/**
 * @param {object[]} nodes
 * @param {Set<string>} selected
 * @param {(value: string, checked: boolean) => void} onToggle
 * @returns {HTMLElement}
 */
function renderTree(nodes, selected, onToggle) {
    const group = document.createElement('div');
    group.setAttribute('role', 'group');
    group.className = 'core-filter-bar__tree-level';
    for (const node of nodes) {
        if (!node || typeof node !== 'object') {
            continue;
        }
        const record = /** @type {Record<string, unknown>} */ (node);
        const label = typeof record.label === 'string' ? record.label : '';
        const row = document.createElement('div');
        row.className = 'core-filter-bar__tree-row';
        if (typeof record.value === 'string') {
            const id = `core-filter-tree-${Math.random().toString(36).slice(2, 9)}`;
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.id = id;
            box.checked = selected.has(record.value);
            box.addEventListener('change', () => onToggle(record.value, box.checked));
            const caption = document.createElement('label');
            caption.setAttribute('for', id);
            caption.textContent = label || record.value;
            row.append(box, caption);
        } else if (label) {
            const caption = document.createElement('span');
            caption.className = 'core-filter-bar__tree-label';
            caption.textContent = label;
            row.append(caption);
        }
        group.append(row);
        if (Array.isArray(record.children) && record.children.length > 0) {
            group.append(renderTree(record.children, selected, onToggle));
        }
    }
    return group;
}
