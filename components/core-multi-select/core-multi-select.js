import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement, mountTrustedHtml, hasBoolAttr, parseJsonAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import { FloatingOverlay } from '../../lib/floating/floating-overlay.js';
import {
    filterOptions,
    normalizeOptions,
    parseSelectedValues
} from '../../lib/multi-select/multi-select-helpers.js';

/**
 * Checkbox multi-select with optional search filter and dropdown panel (default).
 *
 * Options JSON: { value, label?, selected?, image?, imageAlt?, trustedHtml?, description?, keywords?, disabled? }
 * Events: multiselect-change, multiselect-select, multiselect-deselect, multiselect-open, multiselect-close
 */
export class CoreMultiSelect extends Core_UXFormControl {

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'options', 'value', 'name', 'input-id',
            'required', 'disabled', 'searchable', 'search-placeholder', 'max-height',
            'empty-search', 'show-count', 'select-all', 'placeholder', 'always-open',
            'max-visible', 'floating'
        ];
    }

    constructor() {
        super();
        /** @type {Set<unknown>} */
        this._selected = new Set();
        /** @type {string} */
        this._query = '';
        /** @type {Record<string, unknown>[]} */
        this._options = [];
        /** @type {boolean} */
        this._open = false;
        /** @type {boolean} */
        this._suppressFocusOpen = false;
        /** @type {boolean} */
        this._ignoreFocusOut = false;
        /** @type {((event: Event) => void)|null} */
        this._onSearchInput = null;
        /** @type {((event: Event) => void)|null} */
        this._onListChange = null;
        /** @type {((event: Event) => void)|null} */
        this._onSelectVisible = null;
        /** @type {((event: Event) => void)|null} */
        this._onClearAll = null;
        /** @type {((event: MouseEvent) => void)|null} */
        this._onTriggerMouseDown = null;
        /** @type {((event: Event) => void)|null} */
        this._onTriggerKeyDown = null;
        /** @type {((event: Event) => void)|null} */
        this._onTriggerFocus = null;
        /** @type {((event: FocusEvent) => void)|null} */
        this._onShellFocusOut = null;
        /** @type {((event: MouseEvent) => void)|null} */
        this._onDocumentClick = null;
        /** @type {FloatingOverlay|null} */
        this._floating = null;
    }

    onConnect() {
        this._loadOptions();
        this._loadSelection();
        this.render();
    }

    attributeChangedCallback(name) {
        if (!this.isConnected) {
            return;
        }
        if (name === 'options') {
            this._loadOptions();
            this._loadSelection();
        } else if (name === 'value') {
            this._loadSelection();
        }
        if (name === 'disabled' && this.disabled) {
            this.close();
        }
        this.render();
    }

    /** @returns {boolean} Collapsed trigger + panel on focus (default). */
    get dropdown() {
        return !hasBoolAttr(this, 'always-open');
    }

    get searchable() {
        return !this.hasAttribute('searchable') || hasBoolAttr(this, 'searchable');
    }

    get showCount() {
        return hasBoolAttr(this, 'show-count');
    }

    get selectAllEnabled() {
        return hasBoolAttr(this, 'select-all');
    }

    get searchPlaceholder() {
        return this.getAttribute('search-placeholder') || 'Search…';
    }

    get emptySearchText() {
        return this.getAttribute('empty-search') || 'No matches';
    }

    get listMaxHeight() {
        const cssLength = this.getAttribute('max-height');
        if (cssLength) {
            return cssLength;
        }
        const count = this.maxVisible;
        return `calc(${count} * var(--core-multiselect-option-height, 2.75rem))`;
    }

    /** @returns {boolean} */
    get hasToolbar() {
        return this.searchable || this.showCount || this.selectAllEnabled;
    }

    /**
     * Panel max-height: toolbar + N option rows (dropdown / inline with header).
     * @returns {string}
     */
    get panelMaxHeight() {
        const cssLength = this.getAttribute('max-height');
        if (cssLength) {
            return cssLength;
        }
        const listHeight = this.listMaxHeight;
        if (!this.hasToolbar) {
            return listHeight;
        }
        return `calc(var(--core-multiselect-toolbar-height, 0px) + ${listHeight})`;
    }

    /** @returns {number} Visible option rows before the list scrolls. */
    get maxVisible() {
        const parsed = parseInt(this.getAttribute('max-visible') || '6', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
    }

    get placeholder() {
        return this.getAttribute('placeholder') || 'Select…';
    }

    /** @returns {boolean} Portal dropdown panel to body (default true). */
    get floatingEnabled() {
        if (!this.hasAttribute('floating')) {
            return true;
        }
        return hasBoolAttr(this, 'floating');
    }

    get visibleOptions() {
        return filterOptions(this._options, this._query);
    }

    open() {
        if (this.disabled || !this.dropdown || this._open) {
            return;
        }
        this._open = true;
        this._ignoreFocusOut = true;
        this._syncOpenState();
        this._floating?.open();
        this.dispatchEvent(new CustomEvent('multiselect-open', { bubbles: true }));
        window.setTimeout(() => {
            this._ignoreFocusOut = false;
            this._syncScrollLayout();
            this._floating?.reposition();
            const search = this.querySelector('.core-multi-select__search');
            if (search instanceof HTMLInputElement) {
                search.focus();
            }
        }, 0);
    }

    close() {
        if (!this.dropdown || !this._open) {
            return;
        }
        this._floating?.close();
        this._open = false;
        this._query = '';
        const search = this.querySelector('.core-multi-select__search');
        if (search instanceof HTMLInputElement) {
            search.value = '';
        }
        this._syncOpenState();
        this._refreshList();
        this.dispatchEvent(new CustomEvent('multiselect-close', { bubbles: true }));
    }

    toggle() {
        if (this._open) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * @param {unknown[]} values
     */
    setSelected(values) {
        this._selected.clear();
        if (Array.isArray(values)) {
            values.forEach((value) => this._selected.add(value));
        }
        this._syncValueAttribute();
        this._refreshList();
        this._updateTriggerSummary();
        this._emitChange();
    }

    getSelectedValues() {
        return Array.from(this._selected);
    }

    /**
     * @returns {Record<string, unknown>[]}
     */
    getSelectedItems() {
        return this._options.filter((option) => this._selected.has(option.value));
    }

    clearSelection() {
        this.setSelected([]);
    }

    selectVisible() {
        const next = new Set(this._selected);
        this.visibleOptions.forEach((option) => {
            if (!option.disabled) {
                next.add(option.value);
            }
        });
        this._selected = next;
        this._syncValueAttribute();
        this._refreshList();
        this._updateTriggerSummary();
        this._emitChange();
    }

    deselectVisible() {
        const visibleValues = new Set(this.visibleOptions.map((option) => option.value));
        this._selected.forEach((value) => {
            if (visibleValues.has(value)) {
                this._selected.delete(value);
            }
        });
        this._syncValueAttribute();
        this._refreshList();
        this._updateTriggerSummary();
        this._emitChange();
    }

    /**
     * @param {unknown[]} options
     */
    setOptions(options) {
        this._options = normalizeOptions(options);
        this._pruneSelection();
        this._options.forEach((option) => {
            if (option.selected) {
                this._selected.add(option.value);
            }
        });
        this._syncValueAttribute();
        this.render();
    }

    ui_render() {
        const rootClasses = [
            'core-field',
            'core-multi-select',
            this.dropdown ? 'core-multi-select--dropdown' : '',
            this.dropdown && this._open ? 'core-multi-select--open' : '',
            this.hasError ? 'core-multi-select--error' : ''
        ].filter(Boolean).join(' ');

        const field = createElement('div', { className: rootClasses });
        this.appendLabel(field);

        if (this.dropdown) {
            const shell = createElement('div', { className: 'core-multi-select__shell' });
            shell.appendChild(this._buildTrigger());
            shell.appendChild(this._buildPanel());
            field.appendChild(shell);
        } else {
            field.appendChild(this._buildInlineBody());
        }

        field.appendChild(createElement('div', {
            className: 'core-multi-select__hidden',
            attrs: { 'aria-hidden': 'true' }
        }));

        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
        this._syncLabelFor();
    }

    ui_toFunctional() {
        this._wireSearch();
        this._wireList();
        this._wireBulkActions();
        this._wireDropdown();
        this._initFloating();
        this._syncHiddenInputs();
        this._updateCount();
        this._updateTriggerSummary();
        this._syncScrollLayout();

        if (this._open && this.dropdown) {
            this._floating?.open();
        }
    }

    _initFloating() {
        this._floating?.destroy();
        if (!this.dropdown) {
            this._floating = null;
            return;
        }
        this._floating = new FloatingOverlay({
            host: this,
            getPanel: () => this.querySelector('.core-multi-select__panel'),
            getAnchor: () => this.querySelector('.core-multi-select__trigger'),
            getMountPoint: () => this.querySelector('.core-multi-select__shell'),
            isEnabled: () => this.floatingEnabled,
            matchWidth: true,
            align: 'start'
        });
    }

    cleanFunctional() {
        super.cleanFunctional();
        this._floating?.destroy();
        this._floating = null;
        this.querySelector('.core-multi-select__search')
            ?.removeEventListener('input', this._onSearchInput);
        this.querySelector('.core-multi-select__list')
            ?.removeEventListener('change', this._onListChange);
        this.querySelector('[data-core-multiselect-select-visible]')
            ?.removeEventListener('click', this._onSelectVisible);
        this.querySelector('[data-core-multiselect-clear-all]')
            ?.removeEventListener('click', this._onClearAll);
        this.querySelector('.core-multi-select__trigger')
            ?.removeEventListener('mousedown', this._onTriggerMouseDown);
        this.querySelector('.core-multi-select__trigger')
            ?.removeEventListener('keydown', this._onTriggerKeyDown);
        this.querySelector('.core-multi-select__trigger')
            ?.removeEventListener('focus', this._onTriggerFocus);
        this.querySelector('.core-multi-select__shell')
            ?.removeEventListener('focusout', this._onShellFocusOut);
        if (this._onDocumentClick) {
            document.removeEventListener('mousedown', this._onDocumentClick);
        }
        this._onSearchInput = null;
        this._onListChange = null;
        this._onSelectVisible = null;
        this._onClearAll = null;
        this._onTriggerMouseDown = null;
        this._onTriggerKeyDown = null;
        this._onTriggerFocus = null;
        this._onShellFocusOut = null;
        this._onDocumentClick = null;
    }

    _wireSearch() {
        const search = this.querySelector('.core-multi-select__search');
        if (!search) {
            return;
        }
        this._onSearchInput = () => {
            this._query = search.value.trim();
            this._refreshList();
        };
        search.addEventListener('input', this._onSearchInput);
        search.disabled = this.disabled;
    }

    _wireList() {
        this._onListChange = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
                return;
            }
            const value = target.dataset.value;
            if (value === undefined) {
                return;
            }
            const parsedValue = this._parseOptionValue(value);
            const option = this._options.find((item) => String(item.value) === String(parsedValue));
            if (!option || option.disabled) {
                return;
            }
            if (target.checked) {
                this._selected.add(option.value);
                this.dispatchEvent(new CustomEvent('multiselect-select', {
                    bubbles: true,
                    detail: { item: this._publicItem(option) }
                }));
            } else {
                this._selected.delete(option.value);
                this.dispatchEvent(new CustomEvent('multiselect-deselect', {
                    bubbles: true,
                    detail: { item: this._publicItem(option) }
                }));
            }
            this._syncValueAttribute();
            this._updateCount();
            this._updateTriggerSummary();
            this._syncHiddenInputs();
            this._emitChange();
        };
        this.querySelector('.core-multi-select__list')
            ?.addEventListener('change', this._onListChange);
    }

    _wireBulkActions() {
        const selectBtn = this.querySelector('[data-core-multiselect-select-visible]');
        if (selectBtn) {
            this._onSelectVisible = (event) => {
                event.preventDefault();
                this.selectVisible();
            };
            selectBtn.addEventListener('click', this._onSelectVisible);
        }

        const clearBtn = this.querySelector('[data-core-multiselect-clear-all]');
        if (clearBtn) {
            this._onClearAll = (event) => {
                event.preventDefault();
                this.clearSelection();
            };
            clearBtn.addEventListener('click', this._onClearAll);
        }
    }

    _wireDropdown() {
        if (!this.dropdown) {
            return;
        }
        const trigger = this.querySelector('.core-multi-select__trigger');
        const shell = this.querySelector('.core-multi-select__shell');
        if (!trigger || !shell) {
            return;
        }

        this._onTriggerMouseDown = (event) => {
            if (this.disabled) {
                return;
            }
            event.preventDefault();
            this._suppressFocusOpen = true;
            if (this._open) {
                this.close();
            } else {
                this.open();
            }
            trigger.focus();
        };
        this._onTriggerFocus = () => {
            if (this._suppressFocusOpen) {
                this._suppressFocusOpen = false;
                return;
            }
            if (!this.disabled && !this._open) {
                this.open();
            }
        };
        this._onTriggerKeyDown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (this._open) {
                    this.close();
                } else {
                    this.open();
                }
            } else if (event.key === 'Escape' && this._open) {
                event.preventDefault();
                this.close();
                trigger.focus();
            } else if (event.key === 'ArrowDown' && !this._open) {
                event.preventDefault();
                this.open();
            }
        };
        this._onDocumentClick = (event) => {
            if (!this._open || this._floating?.containsTarget(/** @type {Node|null} */ (event.target))) {
                return;
            }
            this.close();
        };
        this._onShellFocusOut = () => {
            window.setTimeout(() => {
                if (!this._open || this._ignoreFocusOut) {
                    return;
                }
                const active = document.activeElement;
                if (active && this._floating?.containsTarget(active)) {
                    return;
                }
                this.close();
            }, 0);
        };

        trigger.addEventListener('mousedown', this._onTriggerMouseDown);
        trigger.addEventListener('focus', this._onTriggerFocus);
        trigger.addEventListener('keydown', this._onTriggerKeyDown);
        shell.addEventListener('focusout', this._onShellFocusOut);
        document.addEventListener('mousedown', this._onDocumentClick);
    }

    /**
     * @returns {HTMLElement}
     */
    _buildInlineBody() {
        const body = createElement('div', {
            className: 'core-multi-select__inline',
            attrs: { style: `--core-multiselect-list-rows:${this.maxVisible}` }
        });
        if (this.hasToolbar) {
            body.appendChild(this._buildToolbar());
        }
        body.appendChild(this._buildList());
        return body;
    }

    /**
     * @returns {HTMLElement}
     */
    _buildPanel() {
        const panel = createElement('div', {
            className: 'core-multi-select__panel',
            attrs: {
                id: `${this.fieldId}-panel`,
                hidden: !this._open || undefined,
                style: `--core-multiselect-list-rows:${this.maxVisible}`
            }
        });

        if (this.hasToolbar) {
            panel.appendChild(this._buildToolbar());
        }
        panel.appendChild(this._buildList());
        return panel;
    }

    /**
     * @returns {HTMLElement}
     */
    _buildTrigger() {
        const trigger = createElement('button', {
            className: `core-multi-select__trigger core-control${this.hasError ? ' core-control--error' : ''}`,
            attrs: {
                type: 'button',
                id: this.fieldId,
                disabled: this.disabled || false,
                'aria-haspopup': 'listbox',
                'aria-expanded': this._open ? 'true' : 'false',
                'aria-controls': `${this.fieldId}-panel`
            }
        });
        trigger.appendChild(createElement('span', {
            className: 'core-multi-select__trigger-text',
            attrs: { 'data-core-multiselect-trigger': true },
            text: this._triggerSummaryText()
        }));
        trigger.appendChild(createElement('span', {
            className: 'core-multi-select__chevron',
            attrs: { 'aria-hidden': 'true' }
        }));
        return trigger;
    }

    /**
     * @returns {HTMLElement}
     */
    _buildList() {
        const list = createElement('div', {
            className: `core-multi-select__list${this.hasError ? ' core-multi-select__list--error' : ''}`,
            attrs: {
                role: 'listbox',
                'aria-multiselectable': 'true',
                'aria-labelledby': this.label ? `${this.fieldId}-label` : undefined,
                style: `--core-multiselect-list-rows:${this.maxVisible};max-height:${this.listMaxHeight}`
            }
        });
        list.id = `${this.fieldId}-list`;
        this._mountOptions(list, this.visibleOptions);
        return list;
    }

    /**
     * Sync panel max-height from measured toolbar so max-visible applies to list rows only.
     */
    _syncScrollLayout() {
        const list = this.querySelector('.core-multi-select__list');
        if (!list) {
            return;
        }

        if (this.getAttribute('max-height')) {
            list.style.maxHeight = this.getAttribute('max-height') || '';
            const shell = this.querySelector('.core-multi-select__panel, .core-multi-select__inline');
            if (shell) {
                shell.style.maxHeight = this.getAttribute('max-height') || '';
                shell.style.removeProperty('--core-multiselect-toolbar-height');
            }
            return;
        }

        list.style.maxHeight = this.listMaxHeight;

        const shell = this.querySelector('.core-multi-select__panel, .core-multi-select__inline');
        const toolbar = this.querySelector('.core-multi-select__toolbar');
        if (!shell) {
            return;
        }

        if (toolbar) {
            shell.style.setProperty('--core-multiselect-toolbar-height', `${toolbar.offsetHeight}px`);
            shell.style.maxHeight = this.panelMaxHeight;
        } else {
            shell.style.removeProperty('--core-multiselect-toolbar-height');
            shell.style.maxHeight = this.listMaxHeight;
        }

        if (this._open) {
            window.requestAnimationFrame(() => this._floating?.reposition());
        }
    }

    _loadOptions() {
        this._options = normalizeOptions(parseJsonAttr(this, 'options', []));
    }

    _loadSelection() {
        this._selected.clear();
        if (this.hasAttribute('value')) {
            parseSelectedValues(this.getAttribute('value')).forEach((value) => {
                this._selected.add(value);
            });
            return;
        }
        this._options.forEach((option) => {
            if (option.selected) {
                this._selected.add(option.value);
            }
        });
    }

    _pruneSelection() {
        const allowed = new Set(this._options.map((option) => option.value));
        this._selected.forEach((value) => {
            if (!allowed.has(value)) {
                this._selected.delete(value);
            }
        });
    }

    _syncValueAttribute() {
        const values = this.getSelectedValues();
        if (values.length === 0) {
            this.removeAttribute('value');
            return;
        }
        this.setAttribute('value', JSON.stringify(values));
    }

    _syncLabelFor() {
        const label = this.querySelector('.core-label');
        if (label) {
            label.id = `${this.fieldId}-label`;
            if (this.dropdown) {
                label.setAttribute('for', this.fieldId);
            } else {
                label.removeAttribute('for');
            }
        }
    }

    _syncOpenState() {
        const root = this.querySelector('.core-multi-select');
        const panel = this.querySelector('.core-multi-select__panel');
        const trigger = this.querySelector('.core-multi-select__trigger');
        if (root) {
            root.classList.toggle('core-multi-select--open', this._open);
        }
        if (panel) {
            if (this._open) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        }
        if (trigger) {
            trigger.setAttribute('aria-expanded', this._open ? 'true' : 'false');
        }
    }

    /**
     * @returns {string}
     */
    _triggerSummaryText() {
        const items = this.getSelectedItems();
        if (items.length === 0) {
            return this.placeholder;
        }
        if (items.length <= 3) {
            return items.map((item) => String(item.label)).join(', ');
        }
        return `${items.length} selected`;
    }

    _updateTriggerSummary() {
        const triggerText = this.querySelector('[data-core-multiselect-trigger]');
        if (!triggerText) {
            return;
        }
        triggerText.textContent = this._triggerSummaryText();
        triggerText.classList.toggle(
            'core-multi-select__trigger-text--placeholder',
            this._selected.size === 0
        );
    }

    /**
     * @returns {HTMLElement}
     */
    _buildToolbar() {
        const toolbar = createElement('div', { className: 'core-multi-select__toolbar' });

        if (this.searchable) {
            toolbar.appendChild(createElement('input', {
                className: 'core-control core-multi-select__search',
                attrs: {
                    type: 'search',
                    placeholder: this.searchPlaceholder,
                    'aria-controls': `${this.fieldId}-list`,
                    autocomplete: 'off',
                    value: this._query
                }
            }));
        }

        const meta = createElement('div', { className: 'core-multi-select__meta' });

        if (this.showCount) {
            meta.appendChild(createElement('span', {
                className: 'core-multi-select__count',
                text: `${this._selected.size} selected`,
                attrs: { 'data-core-multiselect-count': true }
            }));
        }

        if (this.selectAllEnabled) {
            const actions = createElement('div', { className: 'core-multi-select__actions' });
            actions.appendChild(createElement('button', {
                className: 'core-multi-select__action',
                text: 'Select visible',
                attrs: { type: 'button', 'data-core-multiselect-select-visible': true }
            }));
            actions.appendChild(createElement('button', {
                className: 'core-multi-select__action',
                text: 'Clear all',
                attrs: { type: 'button', 'data-core-multiselect-clear-all': true }
            }));
            meta.appendChild(actions);
        }

        if (meta.childNodes.length > 0) {
            toolbar.appendChild(meta);
        }

        return toolbar;
    }

    /**
     * @param {HTMLElement} list
     * @param {Record<string, unknown>[]} options
     */
    _mountOptions(list, options) {
        list.replaceChildren();
        if (options.length === 0) {
            list.appendChild(createElement('p', {
                className: 'core-multi-select__empty',
                text: this._query ? this.emptySearchText : 'No options'
            }));
            return;
        }

        options.forEach((option) => {
            list.appendChild(this._buildOptionRow(option));
        });
    }

    /**
     * @param {Record<string, unknown>} option
     * @returns {HTMLElement}
     */
    _buildOptionRow(option) {
        const row = createElement('label', {
            className: [
                'core-multi-select__option',
                option.disabled ? 'core-multi-select__option--disabled' : ''
            ].filter(Boolean).join(' '),
            attrs: { role: 'option' }
        });

        row.appendChild(createElement('input', {
            className: 'core-check',
            attrs: {
                type: 'checkbox',
                checked: this._selected.has(option.value) || false,
                disabled: this.disabled || option.disabled || false,
                'data-value': this._serializeOptionValue(option.value)
            }
        }));

        const body = createElement('div', { className: 'core-multi-select__option-body' });
        this._mountOptionBody(body, option);
        row.appendChild(body);
        return row;
    }

    /**
     * @param {HTMLElement} body
     * @param {Record<string, unknown>} option
     */
    _mountOptionBody(body, option) {
        if (option.trustedHtml) {
            mountTrustedHtml(body, String(option.trustedHtml));
            return;
        }

        if (option.image) {
            body.appendChild(createElement('img', {
                className: 'core-multi-select__option-image',
                attrs: {
                    src: String(option.image),
                    alt: String(option.imageAlt || option.label),
                    loading: 'lazy',
                    width: '20',
                    height: '15'
                }
            }));
        }

        const textWrap = createElement('div', { className: 'core-multi-select__option-text' });
        textWrap.appendChild(createElement('span', {
            className: 'core-multi-select__option-label',
            text: String(option.label)
        }));
        if (option.description) {
            textWrap.appendChild(createElement('span', {
                className: 'core-multi-select__option-desc',
                text: String(option.description)
            }));
        }
        body.appendChild(textWrap);
    }

    _refreshList() {
        if (this.dropdown && !this._open) {
            return;
        }
        const list = this.querySelector('.core-multi-select__list');
        if (!list) {
            return;
        }
        this._mountOptions(list, this.visibleOptions);
        this._updateCount();
        if (this._open) {
            window.requestAnimationFrame(() => this._floating?.reposition());
        }
    }

    _updateCount() {
        const count = this.querySelector('[data-core-multiselect-count]');
        if (count) {
            count.textContent = `${this._selected.size} selected`;
        }
    }

    _syncHiddenInputs() {
        const host = this.querySelector('.core-multi-select__hidden');
        if (!host) {
            return;
        }
        host.replaceChildren();
        if (!this.hasAttribute('name')) {
            return;
        }
        const name = this.getAttribute('name') || '';
        this.getSelectedValues().forEach((value) => {
            host.appendChild(createElement('input', {
                attrs: {
                    type: 'hidden',
                    name,
                    value: String(value)
                }
            }));
        });
    }

    _emitChange() {
        this.dispatchEvent(new CustomEvent('multiselect-change', {
            bubbles: true,
            detail: {
                values: this.getSelectedValues(),
                items: this.getSelectedItems().map((item) => this._publicItem(item)),
                count: this._selected.size
            }
        }));
    }

    /**
     * @param {Record<string, unknown>} option
     * @returns {Record<string, unknown>}
     */
    _publicItem(option) {
        return {
            value: option.value,
            label: option.label,
            description: option.description || '',
            image: option.image || '',
            trustedHtml: option.trustedHtml || ''
        };
    }

    /**
     * @param {unknown} value
     * @returns {string}
     */
    _serializeOptionValue(value) {
        return encodeURIComponent(JSON.stringify(value));
    }

    /**
     * @param {string} raw
     * @returns {unknown}
     */
    _parseOptionValue(raw) {
        try {
            return JSON.parse(decodeURIComponent(raw));
        } catch (_) {
            return raw;
        }
    }
}

registerCoreComponent('core-multi-select', CoreMultiSelect);
