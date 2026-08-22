import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import { FloatingOverlay } from '../../lib/floating/floating-overlay.js';
import {
    DEFAULT_AUTOCOMPLETE_CONFIG,
    readAutocompleteAttributes,
    resolveAutocompleteI18n
} from '../../lib/autocomplete/autocomplete-config.js';
import {
    filterArrayData,
    getItemDescription,
    getItemText,
    getItemValue,
    normalizeResults
} from '../../lib/autocomplete/autocomplete-helpers.js';

/**
 * Autocomplete combobox — local or async data source, no Semantic UI dependency.
 *
 * Events: autocomplete-select, autocomplete-search, autocomplete-results, autocomplete-open,
 * autocomplete-close, autocomplete-focus, autocomplete-blur, autocomplete-change
 */
export class CoreAutocomplete extends Core_UXElement {

    static get observedAttributes() {
        return [
            'placeholder', 'label', 'disabled', 'min-characters', 'delay', 'max-results',
            'allow-additions', 'force-selection', 'clearable', 'no-results', 'floating'
        ];
    }

    constructor() {
        super();
        /** @type {Record<string, unknown>} */
        this._config = { ...DEFAULT_AUTOCOMPLETE_CONFIG };
        /** @type {unknown} */
        this._dataSource = null;
        /** @type {unknown[]} */
        this._results = [];
        /** @type {ReturnType<typeof setTimeout>|null} */
        this._searchTimeout = null;
        /** @type {Record<string, unknown>|null} */
        this._labelsRepo = null;
        /** @type {Record<string, unknown>|null} */
        this._preConfig = null;
        this._highlightIndex = -1;
        this._panelOpen = false;
        /** @type {string} */
        this._lastQuery = '';
        /** @type {string} */
        this._committedValue = '';
        this._uid = Math.random().toString(36).slice(2, 9);
        /** @type {((event: Event) => void)|null} */
        this._onInput = null;
        /** @type {((event: Event) => void)|null} */
        this._onFocus = null;
        /** @type {((event: Event) => void)|null} */
        this._onBlur = null;
        /** @type {((event: KeyboardEvent) => void)|null} */
        this._onKeyDown = null;
        /** @type {((event: MouseEvent) => void)|null} */
        this._onDocumentClick = null;
        /** @type {((event: Event) => void)|null} */
        this._onClearClick = null;
        /** @type {FloatingOverlay|null} */
        this._floating = null;
    }

    onConnect() {
        if (this._preConfig) {
            Object.assign(this._config, this._preConfig);
        }
        readAutocompleteAttributes(this, this._config);
        this.render();
        this._setupLangSubscription();
    }

    attributeChangedCallback() {
        if (!this.isConnected) {
            return;
        }
        readAutocompleteAttributes(this, this._config);
        this.render();
    }

    /**
     * @param {Record<string, unknown>} options
     */
    preConfigure(options) {
        if (!options || typeof options !== 'object') {
            return;
        }
        this._preConfig = { ...(this._preConfig || {}), ...options };
    }

    /**
     * @param {Record<string, unknown>} options
     */
    configure(options) {
        if (!options || typeof options !== 'object') {
            return;
        }
        const keys = Object.keys(this._config);
        for (const [key, value] of Object.entries(options)) {
            if (keys.includes(key)) {
                this._config[key] = value;
            }
        }
        this._applyI18nLabels();
        if (this.isConnected) {
            this._renderResults();
        }
    }

    /**
     * @param {unknown} dataSource
     */
    setDataSource(dataSource) {
        this._dataSource = dataSource;
    }

    getValue() {
        const input = this._input();
        return input ? input.value : '';
    }

    /**
     * @param {string} value
     */
    setValue(value) {
        const input = this._input();
        if (input) {
            input.value = value;
        }
        this._committedValue = value;
    }

    clear() {
        this.setValue('');
        this._results = [];
        this._closePanel();
        this._renderResults();
    }

    focus() {
        this._input()?.focus();
    }

    blur() {
        this._input()?.blur();
    }

    enable() {
        this.removeAttribute('disabled');
    }

    disable() {
        this.setAttribute('disabled', '');
    }

    /** @returns {boolean} Portal results list to body (default true). */
    get floatingEnabled() {
        if (!this.hasAttribute('floating')) {
            return true;
        }
        return hasBoolAttr(this, 'floating');
    }

    ui_render() {
        const i18n = resolveAutocompleteI18n(this._labelsRepo, this._config);
        const root = createElement('div', {
            className: [
                'core-autocomplete',
                this._config.loading ? 'core-autocomplete--loading' : '',
                hasBoolAttr(this, 'disabled') ? 'core-autocomplete--disabled' : ''
            ].filter(Boolean).join(' ')
        });

        if (i18n.labelText) {
            root.appendChild(createElement('label', {
                className: 'core-label',
                text: String(i18n.labelText),
                attrs: { for: this._inputId() }
            }));
        }

        const controlWrap = createElement('div', { className: 'core-autocomplete__control' });
        controlWrap.appendChild(createElement('input', {
            className: 'core-control core-autocomplete__input',
            attrs: {
                type: 'text',
                id: this._inputId(),
                placeholder: String(i18n.placeholder || ''),
                autocomplete: 'off',
                role: 'combobox',
                'aria-autocomplete': 'list',
                'aria-expanded': 'false',
                'aria-controls': this._listId(),
                disabled: hasBoolAttr(this, 'disabled') || false
            }
        }));

        if (this._config.clearable) {
            controlWrap.appendChild(createElement('button', {
                className: 'core-autocomplete__clear',
                text: '\u00D7',
                attrs: {
                    type: 'button',
                    'data-core-autocomplete-clear': true,
                    'aria-label': 'Clear',
                    hidden: true
                }
            }));
        }

        controlWrap.appendChild(createElement('span', {
            className: 'core-autocomplete__spinner',
            attrs: { 'aria-hidden': 'true', hidden: true }
        }));

        root.appendChild(controlWrap);
        root.appendChild(createElement('ul', {
            className: 'core-autocomplete__list',
            attrs: {
                id: this._listId(),
                role: 'listbox',
                hidden: true
            }
        }));

        this.replaceChildren(root);
        this._applyI18nLabels();
    }

    ui_toFunctional() {
        const input = this._input();
        if (!input) {
            return;
        }

        this._onInput = () => {
            this._syncClearButton();
            this._handleInputChange(input.value);
        };
        this._onFocus = () => {
            this.dispatchEvent(new CustomEvent('autocomplete-focus', { bubbles: true }));
            if (this._results.length > 0) {
                this._openPanel();
            }
        };
        this._onBlur = () => {
            window.setTimeout(() => {
                if (this._config.forceSelection && input.value !== this._committedValue) {
                    input.value = this._committedValue;
                }
                this._closePanel();
                this.dispatchEvent(new CustomEvent('autocomplete-blur', { bubbles: true }));
            }, 150);
        };
        this._onKeyDown = (event) => this._handleKeyDown(event);
        this._onDocumentClick = (event) => {
            if (this._floating?.containsTarget(/** @type {Node|null} */ (event.target))) {
                return;
            }
            this._closePanel();
        };
        this._onClearClick = (event) => {
            event.preventDefault();
            this.clear();
            this.focus();
        };

        this._initFloating();

        input.addEventListener('input', this._onInput);
        input.addEventListener('focus', this._onFocus);
        input.addEventListener('blur', this._onBlur);
        input.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('click', this._onDocumentClick);
        this.querySelector('[data-core-autocomplete-clear]')
            ?.addEventListener('click', this._onClearClick);

        if (this._panelOpen) {
            this._floating?.open();
        }
    }

    cleanFunctional() {
        super.cleanFunctional();
        if (this._searchTimeout) {
            clearTimeout(this._searchTimeout);
            this._searchTimeout = null;
        }
        const input = this._input();
        if (input) {
            if (this._onInput) {
                input.removeEventListener('input', this._onInput);
            }
            if (this._onFocus) {
                input.removeEventListener('focus', this._onFocus);
            }
            if (this._onBlur) {
                input.removeEventListener('blur', this._onBlur);
            }
            if (this._onKeyDown) {
                input.removeEventListener('keydown', this._onKeyDown);
            }
        }
        if (this._onDocumentClick) {
            document.removeEventListener('click', this._onDocumentClick);
        }
        this.querySelector('[data-core-autocomplete-clear]')
            ?.removeEventListener('click', this._onClearClick);
        this._onInput = null;
        this._onFocus = null;
        this._onBlur = null;
        this._onKeyDown = null;
        this._onDocumentClick = null;
        this._onClearClick = null;
        this._floating?.destroy();
        this._floating = null;
    }

    _initFloating() {
        this._floating?.destroy();
        this._floating = new FloatingOverlay({
            host: this,
            getPanel: () => this._list(),
            getAnchor: () => this._input(),
            getMountPoint: () => this.querySelector('.core-autocomplete'),
            isEnabled: () => this.floatingEnabled,
            matchWidth: true,
            align: 'start'
        });
    }

    _setupLangSubscription() {
        try {
            this.addSub(
                $svc('lang').getData().subscribe((labels) => {
                    this._labelsRepo = labels;
                    this._applyI18nLabels();
                })
            );
        } catch (_) {
            /* lang service optional */
        }
    }

    _applyI18nLabels() {
        const i18n = resolveAutocompleteI18n(this._labelsRepo, this._config);
        const input = this._input();
        if (input && i18n.placeholder) {
            input.setAttribute('placeholder', String(i18n.placeholder));
        }
        const label = this.querySelector('.core-label');
        if (label && i18n.labelText) {
            label.textContent = String(i18n.labelText);
        }
        if (this._panelOpen) {
            this._renderResults();
        }
    }

    /**
     * @param {string} value
     */
    _handleInputChange(value) {
        this.dispatchEvent(new CustomEvent('autocomplete-change', {
            bubbles: true,
            detail: { query: value }
        }));
        if (this._searchTimeout) {
            clearTimeout(this._searchTimeout);
        }
        this._searchTimeout = setTimeout(() => {
            this.performSearch(value);
        }, this._config.delay);
    }

    /**
     * @param {string} query
     */
    async performSearch(query) {
        this._lastQuery = query;
        this.dispatchEvent(new CustomEvent('autocomplete-search', {
            bubbles: true,
            detail: { query }
        }));

        if (!query || query.length < this._config.minCharacters) {
            this._results = [];
            this._closePanel();
            this._renderResults();
            return;
        }

        this.setLoading(true);

        try {
            let results = [];

            if (this._dataSource) {
                if (typeof this._dataSource === 'function') {
                    const sourceResult = this._dataSource(query);
                    if (sourceResult && typeof sourceResult.subscribe === 'function') {
                        sourceResult.subscribe({
                            next: (data) => {
                                this.updateResults({ results: normalizeResults(data) });
                            },
                            error: () => {
                                this.updateResults({ results: [] });
                            }
                        });
                        return;
                    }
                    results = await sourceResult;
                } else if (Array.isArray(this._dataSource)) {
                    results = filterArrayData(
                        this._dataSource,
                        query,
                        this._config.maxResults
                    );
                }
            }

            this.updateResults(results);
        } catch (_) {
            this.updateResults([]);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * @param {unknown} results
     */
    updateResults(results) {
        this._results = normalizeResults(results);
        this._highlightIndex = this._results.length > 0 ? 0 : -1;
        this._renderResults();
        if (this._results.length > 0 || (this._config.showNoResults && this._lastQuery)) {
            this._openPanel();
        } else {
            this._closePanel();
        }
        this.dispatchEvent(new CustomEvent('autocomplete-results', {
            bubbles: true,
            detail: { response: { results: this._results } }
        }));
    }

    /**
     * @param {unknown} rawItem
     */
    _selectItem(rawItem) {
        const title = getItemText(rawItem);
        const value = getItemValue(rawItem);
        const result = {
            title,
            description: getItemDescription(rawItem),
            value,
            raw: rawItem
        };
        this.setValue(title);
        this._committedValue = title;
        this._closePanel();
        this._syncClearButton();
        this.dispatchEvent(new CustomEvent('autocomplete-select', {
            bubbles: true,
            detail: { result }
        }));
    }

    /**
     * @param {KeyboardEvent} event
     */
    _handleKeyDown(event) {
        if (!this._panelOpen) {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
                && this._optionCount() > 0) {
                event.preventDefault();
                this._openPanel();
                this._setHighlightIndex(
                    event.key === 'ArrowUp' || event.key === 'End'
                        ? this._optionCount() - 1
                        : 0
                );
            }
            return;
        }
        const max = this._optionCount() - 1;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this._setHighlightIndex(Math.min(max, this._highlightIndex + 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this._setHighlightIndex(Math.max(0, this._highlightIndex - 1));
        } else if (event.key === 'Home') {
            event.preventDefault();
            this._setHighlightIndex(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            this._setHighlightIndex(max);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const item = this._highlightedItem();
            if (item !== null) {
                this._selectItem(item);
            } else if (this._config.allowAdditions && this._lastQuery) {
                this._selectItem({ title: this._lastQuery, value: this._lastQuery });
            }
        } else if (event.key === 'Escape') {
            this._closePanel();
        }
    }

    _renderResults() {
        const list = this._list();
        if (!list) {
            return;
        }
        list.replaceChildren();
        const i18n = resolveAutocompleteI18n(this._labelsRepo, this._config);

        this._results.forEach((item, index) => {
            const option = createElement('li', {
                className: [
                    'core-autocomplete__option',
                    index === this._highlightIndex ? 'core-autocomplete__option--active' : ''
                ].filter(Boolean).join(' '),
                attrs: {
                    id: this._optionId(index),
                    role: 'option',
                    'aria-selected': index === this._highlightIndex ? 'true' : 'false',
                    'data-index': String(index)
                }
            });
            option.appendChild(createElement('span', {
                className: 'core-autocomplete__option-title',
                text: getItemText(item)
            }));
            const description = getItemDescription(item);
            if (description) {
                option.appendChild(createElement('span', {
                    className: 'core-autocomplete__option-desc',
                    text: description
                }));
            }
            option.addEventListener('mousedown', (event) => {
                event.preventDefault();
                this._selectItem(item);
            });
            list.appendChild(option);
        });

        if (this._config.allowAdditions && this._lastQuery
            && !this._results.some((item) => getItemText(item).toLowerCase() === this._lastQuery.toLowerCase())) {
            const addIndex = this._results.length;
            const addOption = createElement('li', {
                className: [
                    'core-autocomplete__option',
                    'core-autocomplete__option--add',
                    addIndex === this._highlightIndex ? 'core-autocomplete__option--active' : ''
                ].filter(Boolean).join(' '),
                attrs: {
                    id: this._optionId(addIndex),
                    role: 'option',
                    'aria-selected': addIndex === this._highlightIndex ? 'true' : 'false',
                    'data-index': String(addIndex)
                }
            });
            addOption.appendChild(createElement('span', {
                className: 'core-autocomplete__option-title',
                text: `Add "${this._lastQuery}"`
            }));
            addOption.addEventListener('mousedown', (event) => {
                event.preventDefault();
                this._selectItem({ title: this._lastQuery, value: this._lastQuery });
            });
            list.appendChild(addOption);
        }

        if (this._config.showNoResults && this._results.length === 0 && this._lastQuery) {
            list.appendChild(createElement('li', {
                className: 'core-autocomplete__empty',
                text: String(i18n.noResultsText || 'No results'),
                attrs: { role: 'presentation' }
            }));
        }

        if (this._panelOpen) {
            window.requestAnimationFrame(() => this._floating?.reposition());
        }
        this._syncActiveDescendant();
    }

    /**
     * Keep visual and ARIA active-option state tied to the same index.
     *
     * @param {number} index
     */
    _setHighlightIndex(index) {
        const max = this._optionCount() - 1;
        this._highlightIndex = index < 0 || max < 0
            ? -1
            : Math.min(index, max);
        this._list()?.querySelectorAll('[role="option"]').forEach((option, optionIndex) => {
            const active = optionIndex === this._highlightIndex;
            option.classList.toggle('core-autocomplete__option--active', active);
            option.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this._syncActiveDescendant();
    }

    _syncActiveDescendant() {
        const input = this._input();
        const activeOption = this._panelOpen && this._highlightIndex >= 0
            ? this._list()?.querySelector(`#${this._optionId(this._highlightIndex)}`)
            : null;
        if (input && activeOption) {
            input.setAttribute('aria-activedescendant', activeOption.id);
        } else {
            input?.removeAttribute('aria-activedescendant');
        }
    }

    _optionCount() {
        let count = this._results.length;
        if (this._config.allowAdditions && this._lastQuery
            && !this._results.some((item) => getItemText(item).toLowerCase() === this._lastQuery.toLowerCase())) {
            count += 1;
        }
        return count;
    }

    /**
     * @returns {unknown|null}
     */
    _highlightedItem() {
        if (this._highlightIndex < 0) {
            return null;
        }
        if (this._highlightIndex < this._results.length) {
            return this._results[this._highlightIndex];
        }
        if (this._config.allowAdditions && this._lastQuery) {
            return { title: this._lastQuery, value: this._lastQuery };
        }
        return null;
    }

    _openPanel() {
        const list = this._list();
        const input = this._input();
        if (!list || !input) {
            return;
        }
        list.removeAttribute('hidden');
        input.setAttribute('aria-expanded', 'true');
        if (this._highlightIndex < 0 && this._optionCount() > 0) {
            this._setHighlightIndex(0);
        }
        if (!this._panelOpen) {
            this._panelOpen = true;
            this.dispatchEvent(new CustomEvent('autocomplete-open', { bubbles: true }));
        }
        this._syncActiveDescendant();
        this._floating?.open();
        window.requestAnimationFrame(() => this._floating?.reposition());
    }

    _closePanel() {
        const list = this._list();
        const input = this._input();
        if (!list || !input) {
            return;
        }
        this._floating?.close();
        list.setAttribute('hidden', '');
        input.setAttribute('aria-expanded', 'false');
        this._setHighlightIndex(-1);
        if (this._panelOpen) {
            this._panelOpen = false;
            this.dispatchEvent(new CustomEvent('autocomplete-close', { bubbles: true }));
        }
    }

    /**
     * @param {boolean} loading
     */
    setLoading(loading) {
        this._config.loading = loading;
        this.classList.toggle('core-autocomplete--loading', loading);
        const spinner = this.querySelector('.core-autocomplete__spinner');
        if (spinner) {
            if (loading) {
                spinner.removeAttribute('hidden');
            } else {
                spinner.setAttribute('hidden', '');
            }
        }
    }

    _syncClearButton() {
        const clearBtn = this.querySelector('[data-core-autocomplete-clear]');
        const input = this._input();
        if (!clearBtn || !input) {
            return;
        }
        if (input.value) {
            clearBtn.removeAttribute('hidden');
        } else {
            clearBtn.setAttribute('hidden', '');
        }
    }

    _inputId() {
        return this.getAttribute('input-id') || `core-autocomplete-${this._uid}`;
    }

    _listId() {
        return `${this._inputId()}-list`;
    }

    /**
     * @param {number} index
     * @returns {string}
     */
    _optionId(index) {
        return `${this._listId()}-option-${index}`;
    }

    /** @returns {HTMLInputElement|null} */
    _input() {
        return this.querySelector('.core-autocomplete__input');
    }

    /** @returns {HTMLElement|null} */
    _list() {
        return this.querySelector('.core-autocomplete__list');
    }
}

registerCoreComponent('core-autocomplete', CoreAutocomplete);

/** @deprecated Use CoreAutocomplete — alias for apps extending the base class. */
export const AutocompleteComponent = CoreAutocomplete;
