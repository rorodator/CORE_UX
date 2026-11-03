import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { foldText } from 'CORE_JS/lib/value/core-text-match.js';
import { FloatingOverlay } from '../../lib/floating/floating-overlay.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * @typedef {object} FilterPickerEntry
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {string[]} keywords
 * @property {string[]} groupPath
 * @property {boolean} disabled
 */

/**
 * @typedef {object} FilterPickerGroupNode
 * @property {'group'} kind
 * @property {string} label
 * @property {number} level
 * @property {FilterPickerTreeNode[]} children
 */

/**
 * @typedef {object} FilterPickerEntryNode
 * @property {'entry'} kind
 * @property {FilterPickerEntry} entry
 * @property {number} level
 */

/**
 * @typedef {FilterPickerGroupNode|FilterPickerEntryNode} FilterPickerTreeNode
 */

/**
 * Catalog records use the same fields as a filter definition:
 * `id`, `label`, `description`, `keywords`, `group` or `groupPath`, `disabled`, `visible`.
 * `visible: false` is omitted. A `group` string such as "Trading / Dates" becomes `groupPath`.
 * This element does not import an engine and does not know instances.
 *
 * @param {unknown} input
 * @returns {FilterPickerEntry[]}
 */
export function normalizeFilterPickerEntries(input) {
    if (!Array.isArray(input)) {
        return [];
    }
    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {FilterPickerEntry[]} */
    const entries = [];
    for (const item of input) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const record = /** @type {Record<string, unknown>} */ (item);
        if (record.visible === false) {
            continue;
        }
        const id = typeof record.id === 'string' ? record.id : '';
        if (!id || seen.has(id)) {
            continue;
        }
        seen.add(id);
        const label = typeof record.label === 'string' && record.label ? record.label : id;
        const description = typeof record.description === 'string' ? record.description : '';
        const keywords = Array.isArray(record.keywords)
            ? record.keywords.filter((keyword) => typeof keyword === 'string')
            : [];
        entries.push({
            id,
            label,
            description,
            keywords,
            groupPath: groupPathOf(record),
            disabled: record.disabled === true,
        });
    }
    return entries;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string[]}
 */
function groupPathOf(record) {
    if (Array.isArray(record.groupPath)) {
        return record.groupPath
            .filter((part) => typeof part === 'string' && part.trim())
            .map((part) => part.trim());
    }
    if (typeof record.group === 'string' && record.group.trim()) {
        return record.group.split(/\s+\/\s+/).map((part) => part.trim()).filter(Boolean);
    }
    return [];
}

/**
 * @param {FilterPickerEntry[]} entries
 * @returns {FilterPickerTreeNode[]}
 */
function buildTree(entries) {
    /** @type {FilterPickerTreeNode[]} */
    const roots = [];
    /** @type {Map<string, FilterPickerGroupNode>} */
    const groups = new Map();

    for (const entry of entries) {
        /** @type {FilterPickerTreeNode[]} */
        let bucket = roots;
        let key = '';
        entry.groupPath.forEach((label, index) => {
            key = key ? `${key}\u0000${label}` : label;
            let group = groups.get(key);
            if (!group) {
                group = { kind: 'group', label, level: index + 1, children: [] };
                groups.set(key, group);
                bucket.push(group);
            }
            bucket = group.children;
        });
        bucket.push({ kind: 'entry', entry, level: entry.groupPath.length + 1 });
    }
    return roots;
}

/**
 * @param {FilterPickerEntry} entry
 * @param {string} needle
 * @returns {boolean}
 */
function entryMatches(entry, needle) {
    const fields = [entry.label, entry.description, ...entry.keywords, ...entry.groupPath];
    return fields.some((field) => foldText(field).includes(needle));
}

/**
 * @param {FilterPickerTreeNode[]} nodes
 * @param {string} needle
 * @param {boolean} ancestorMatched
 * @returns {FilterPickerTreeNode[]}
 */
function filterTree(nodes, needle, ancestorMatched) {
    if (!needle) {
        return nodes;
    }
    /** @type {FilterPickerTreeNode[]} */
    const result = [];
    for (const node of nodes) {
        if (node.kind === 'entry') {
            if (ancestorMatched || entryMatches(node.entry, needle)) {
                result.push(node);
            }
            continue;
        }
        const selfMatched = ancestorMatched || foldText(node.label).includes(needle);
        const children = filterTree(node.children, needle, selfMatched);
        if (selfMatched || children.length > 0) {
            result.push({ ...node, children: selfMatched ? node.children : children });
        }
    }
    return result;
}

/**
 * Search field plus a hierarchical catalog. Typing filters and can open the tree.
 * The browse button opens the full tree, or the tree already filtered by the field.
 * Choosing an entry emits `core-filter-picker-select` and, by default, clears the field.
 */
export class CoreFilterPicker extends Core_UXElement {

    static get observedAttributes() {
        return ['label', 'placeholder', 'button-label', 'disabled', 'open', 'query', 'keep-query'];
    }

    constructor() {
        super();
        /** @type {FilterPickerEntry[]} */
        this._entries = [];
        this._query = '';
        this._activeId = '';
        this._uid = Math.random().toString(36).slice(2, 9);
        /** @type {FloatingOverlay|null} */
        this._floating = null;
        this._restoreFocus = false;
        /** @type {((event: MouseEvent) => void)|null} */
        this._onDocumentClick = null;
        /** @type {Document|null} */
        this._clickDocument = null;
        /** @type {((event: MouseEvent) => void)|null} */
        this._onPanelClick = null;
        /** @type {HTMLElement|null} */
        this._panelBound = null;
    }

    onConnect() {
        if (this.hasAttribute('query')) {
            this._query = this.getAttribute('query') || '';
        }
        this.render();
        this._syncOpen();
    }

    onDisconnect() {
        this._floating?.destroy();
        this._floating = null;
        this._unbindDocumentClick();
        this._unbindPanel();
    }

    /**
     * @param {string} name
     */
    attributeChangedCallback(name) {
        if (!this.isConnected) {
            return;
        }
        if (name === 'label' || name === 'placeholder' || name === 'button-label' || name === 'disabled') {
            this._syncChrome();
            if (name === 'disabled' && this.disabled && this.open) {
                this.closeMenu();
            }
            return;
        }
        if (name === 'open') {
            this._syncOpen();
            return;
        }
        if (name === 'query') {
            const next = this.getAttribute('query') || '';
            if (next !== this._query) {
                this.query = next;
            }
        }
    }

    get open() {
        return hasBoolAttr(this, 'open');
    }

    get disabled() {
        return hasBoolAttr(this, 'disabled');
    }

    get keepQuery() {
        return hasBoolAttr(this, 'keep-query');
    }

    get query() {
        return this._query;
    }

    /**
     * @param {string} value
     */
    set query(value) {
        this._query = String(value ?? '');
        this._activeId = '';
        const input = this._input();
        if (input && input.value !== this._query) {
            input.value = this._query;
        }
        if (this.isConnected) {
            this._paint();
        }
    }

    get inputId() {
        return `${this.id || `core-filter-picker-${this._uid}`}-input`;
    }

    get panelId() {
        return `${this.id || `core-filter-picker-${this._uid}`}-panel`;
    }

    /**
     * @param {unknown} entries Definition records or picker entries.
     */
    setEntries(entries) {
        this._entries = normalizeFilterPickerEntries(entries);
        if (this._activeId && !this._entries.some((entry) => entry.id === this._activeId && !entry.disabled)) {
            this._activeId = '';
        }
        if (this.isConnected) {
            this._paint();
        }
    }

    /**
     * @returns {readonly FilterPickerEntry[]}
     */
    getEntries() {
        return Object.freeze(this._entries.map((entry) => Object.freeze({
            ...entry,
            keywords: Object.freeze([...entry.keywords]),
            groupPath: Object.freeze([...entry.groupPath]),
        })));
    }

    openMenu() {
        if (this.disabled || this.open) {
            return;
        }
        this.setAttribute('open', '');
    }

    /**
     * @param {{ restoreFocus?: boolean }} [options]
     */
    closeMenu({ restoreFocus = false } = {}) {
        if (!this.open) {
            return;
        }
        this._restoreFocus = restoreFocus;
        this.removeAttribute('open');
    }

    ui_render() {
        const wrap = createElement('div', { className: 'core-filter-picker' });
        const labelText = this._labelText();
        if (labelText) {
            wrap.appendChild(createElement('label', {
                className: 'core-filter-picker__label',
                text: labelText,
                attrs: { for: this.inputId, 'data-core-filter-picker-label': true },
            }));
        }

        const control = createElement('div', {
            className: 'core-filter-picker__control',
            attrs: { 'data-core-filter-picker-anchor': true },
        });
        const input = createElement('input', {
            className: 'core-control core-filter-picker__input',
            attrs: {
                type: 'text',
                id: this.inputId,
                role: 'combobox',
                autocomplete: 'off',
                'aria-autocomplete': 'list',
                'aria-haspopup': 'tree',
                'aria-expanded': 'false',
                'aria-controls': this.panelId,
                placeholder: this._placeholder(),
                disabled: this.disabled || false,
                'data-core-filter-picker-input': true,
            },
        });
        input.value = this._query;
        if (!labelText) {
            input.setAttribute('aria-label', 'Search filters');
        }
        control.appendChild(input);

        const button = createElement('button', {
            className: 'core-filter-picker__browse',
            attrs: {
                type: 'button',
                'aria-haspopup': 'tree',
                'aria-expanded': 'false',
                'aria-controls': this.panelId,
                disabled: this.disabled || false,
                'data-core-filter-picker-browse': true,
            },
        });
        button.appendChild(createElement('span', {
            text: this._buttonLabel(),
            attrs: { 'data-core-filter-picker-button-label': true },
        }));
        button.appendChild(createElement('span', {
            className: 'core-filter-picker__chevron',
            text: '\u25BE',
            attrs: { 'aria-hidden': 'true' },
        }));
        control.appendChild(button);
        wrap.appendChild(control);

        wrap.appendChild(createElement('div', {
            className: 'core-filter-picker__panel',
            attrs: {
                id: this.panelId,
                role: 'tree',
                'aria-label': labelText || 'Filters',
                hidden: true,
            },
        }));
        this.replaceChildren(wrap);
    }

    ui_toFunctional() {
        this._initFloating();
        this.bindUI('input', (event) => {
            if (event.target !== this._input()) {
                return;
            }
            this._query = this._input()?.value || '';
            this._activeId = '';
            this._paint();
            if (this._query.trim() && !this.disabled) {
                this.openMenu();
            }
        });
        this.bindUI('keydown', (event) => {
            this._onKeydown(/** @type {KeyboardEvent} */ (event));
        });
        this.bindDelegated('click', '[data-core-filter-picker-browse]', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (this.disabled) {
                return;
            }
            if (this.open) {
                this.closeMenu();
                return;
            }
            this.openMenu();
            this._input()?.focus();
        });
        this._paint();
    }

    cleanFunctional() {
        super.cleanFunctional();
        this._unbindPanel();
        this._unbindDocumentClick();
        this._floating?.destroy();
        this._floating = null;
    }

    /**
     * @returns {string}
     */
    _labelText() {
        if (this.hasAttribute('label')) {
            return this.getAttribute('label') || '';
        }
        return 'Add a filter';
    }

    /**
     * @returns {string}
     */
    _placeholder() {
        if (this.hasAttribute('placeholder')) {
            return this.getAttribute('placeholder') || '';
        }
        return 'Search filters';
    }

    /**
     * @returns {string}
     */
    _buttonLabel() {
        if (this.hasAttribute('button-label')) {
            return this.getAttribute('button-label') || '';
        }
        return 'Browse';
    }

    _syncChrome() {
        const label = this.querySelector('[data-core-filter-picker-label]');
        const input = this._input();
        const buttonLabel = this.querySelector('[data-core-filter-picker-button-label]');
        const button = this._button();
        const text = this._labelText();
        if (label) {
            label.textContent = text;
        }
        if (input) {
            input.placeholder = this._placeholder();
            input.disabled = this.disabled;
            if (text) {
                input.removeAttribute('aria-label');
            } else {
                input.setAttribute('aria-label', 'Search filters');
            }
            input.setAttribute('aria-expanded', this.open ? 'true' : 'false');
        }
        if (buttonLabel) {
            buttonLabel.textContent = this._buttonLabel();
        }
        if (button) {
            button.disabled = this.disabled;
            button.setAttribute('aria-expanded', this.open ? 'true' : 'false');
        }
        const panel = this._panelEl();
        if (panel) {
            panel.setAttribute('aria-label', text || 'Filters');
        }
    }

    /**
     * @returns {HTMLInputElement|null}
     */
    _input() {
        return this.querySelector('[data-core-filter-picker-input]');
    }

    /**
     * @returns {HTMLButtonElement|null}
     */
    _button() {
        return this.querySelector('[data-core-filter-picker-browse]');
    }

    /**
     * @returns {HTMLElement|null}
     */
    _panelEl() {
        return this._floating?.getPanel() || this.querySelector('.core-filter-picker__panel');
    }

    _initFloating() {
        this._floating?.destroy();
        this._floating = new FloatingOverlay({
            host: this,
            getPanel: () => this.querySelector('.core-filter-picker__panel'),
            getAnchor: () => this.querySelector('[data-core-filter-picker-anchor]'),
            getMountPoint: () => this.querySelector(':scope > .core-filter-picker'),
            align: 'start',
            matchWidth: true,
            isEnabled: () => !this.disabled,
        });
    }

    _syncOpen() {
        const panel = this._panelEl();
        const input = this._input();
        const button = this._button();
        if (!panel || !input || !button) {
            return;
        }
        const expanded = this.open ? 'true' : 'false';
        input.setAttribute('aria-expanded', expanded);
        button.setAttribute('aria-expanded', expanded);
        if (this.open) {
            panel.removeAttribute('hidden');
            this._paint();
            this._floating?.open();
            this._bindDocumentClick();
            this._bindPanel();
            return;
        }
        this._floating?.close();
        this._unbindPanel();
        panel.setAttribute('hidden', '');
        input.removeAttribute('aria-activedescendant');
        this._unbindDocumentClick();
        if (this._restoreFocus) {
            this._restoreFocus = false;
            input.focus();
        }
    }

    _paint() {
        const panel = this._panelEl();
        if (!panel) {
            return;
        }
        const needle = foldText(this._query.trim());
        const tree = filterTree(buildTree(this._entries), needle, false);
        panel.replaceChildren();
        const context = { index: 0 };
        this._appendNodes(panel, tree, context);
        if (context.index === 0) {
            panel.appendChild(createElement('div', {
                className: 'core-filter-picker__empty',
                text: 'No matching filters',
                attrs: { role: 'status' },
            }));
        }
        this._markActive();
    }

    /**
     * @param {HTMLElement} parent
     * @param {FilterPickerTreeNode[]} nodes
     * @param {{ index: number }} context
     */
    _appendNodes(parent, nodes, context) {
        for (const node of nodes) {
            if (node.kind === 'group') {
                const branch = createElement('div', { className: 'core-filter-picker__branch' });
                const heading = createElement('div', {
                    className: 'core-filter-picker__group',
                    text: node.label,
                    attrs: { role: 'presentation' },
                });
                heading.style.paddingLeft = `${node.level * 0.75}rem`;
                branch.appendChild(heading);
                const group = createElement('div', {
                    attrs: { role: 'group', 'aria-label': node.label },
                });
                this._appendNodes(group, node.children, context);
                branch.appendChild(group);
                parent.appendChild(branch);
                continue;
            }
            const option = createElement('div', {
                className: 'core-filter-picker__option',
                attrs: {
                    role: 'treeitem',
                    id: `${this.panelId}-opt-${context.index}`,
                    'data-entry-id': node.entry.id,
                    'aria-level': String(node.level),
                    'aria-disabled': node.entry.disabled ? 'true' : false,
                },
            });
            context.index += 1;
            option.style.paddingLeft = `${node.level * 0.75}rem`;
            option.appendChild(createElement('span', {
                className: 'core-filter-picker__option-label',
                text: node.entry.label,
            }));
            if (node.entry.description) {
                option.appendChild(createElement('span', {
                    className: 'core-filter-picker__option-desc',
                    text: node.entry.description,
                }));
            }
            parent.appendChild(option);
        }
    }

    /**
     * @returns {HTMLElement[]}
     */
    _selectable() {
        const panel = this._panelEl();
        if (!panel) {
            return [];
        }
        return Array.from(panel.querySelectorAll('[role="treeitem"]:not([aria-disabled="true"])'));
    }

    _markActive() {
        const items = this._selectable();
        const current = items.find((item) => item.dataset.entryId === this._activeId) || null;
        const active = current || items[0] || null;
        this._activeId = active?.dataset.entryId || '';
        const panel = this._panelEl();
        panel?.querySelectorAll('[role="treeitem"]').forEach((item) => {
            item.classList.toggle('core-filter-picker__option--active', item === active);
        });
        const input = this._input();
        if (!input) {
            return;
        }
        if (this.open && active) {
            input.setAttribute('aria-activedescendant', active.id);
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    /**
     * @param {number} delta
     */
    _move(delta) {
        const items = this._selectable();
        if (!items.length) {
            return;
        }
        const index = items.findIndex((item) => item.dataset.entryId === this._activeId);
        const next = index < 0
            ? (delta < 0 ? items.length - 1 : 0)
            : (index + delta + items.length) % items.length;
        this._activeId = items[next].dataset.entryId || '';
        this._markActive();
    }

    /**
     * @param {'first'|'last'} edge
     */
    _activateEdge(edge) {
        const items = this._selectable();
        const item = edge === 'last' ? items[items.length - 1] : items[0];
        this._activeId = item?.dataset.entryId || '';
        this._markActive();
    }

    /**
     * @param {KeyboardEvent} event
     */
    _onKeydown(event) {
        if (this.disabled || event.target !== this._input()) {
            if (event.target === this._button() && event.key === 'Escape' && this.open) {
                event.preventDefault();
                this.closeMenu();
            }
            if (event.target === this._button() && event.key === 'Tab' && this.open) {
                this.closeMenu();
            }
            return;
        }
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!this.open) {
                    this.openMenu();
                    this._activateEdge('first');
                } else {
                    this._move(1);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (!this.open) {
                    this.openMenu();
                    this._activateEdge('last');
                } else {
                    this._move(-1);
                }
                break;
            case 'Home':
                if (!this.open) {
                    return;
                }
                event.preventDefault();
                this._activateEdge('first');
                break;
            case 'End':
                if (!this.open) {
                    return;
                }
                event.preventDefault();
                this._activateEdge('last');
                break;
            case 'Enter':
                event.preventDefault();
                if (this.open && this._activeId) {
                    this._choose(this._activeId);
                } else if (!this.open) {
                    this.openMenu();
                }
                break;
            case 'Escape':
                if (!this.open) {
                    return;
                }
                event.preventDefault();
                this.closeMenu({ restoreFocus: true });
                break;
            case 'Tab':
                if (this.open) {
                    this.closeMenu();
                }
                break;
            default:
                break;
        }
    }

    /**
     * @param {string} id
     */
    _choose(id) {
        const entry = this._entries.find((item) => item.id === id);
        if (!entry || entry.disabled) {
            return;
        }
        if (!this.keepQuery) {
            this._query = '';
            this._activeId = '';
            const input = this._input();
            if (input) {
                input.value = '';
            }
        }
        this.closeMenu({ restoreFocus: true });
        this.dispatchEvent(new CustomEvent('core-filter-picker-select', {
            bubbles: true,
            detail: {
                id: entry.id,
                label: entry.label,
                description: entry.description,
                keywords: [...entry.keywords],
                groupPath: [...entry.groupPath],
            },
        }));
    }

    _bindDocumentClick() {
        if (this._onDocumentClick) {
            return;
        }
        const ownerDocument = this.ownerDocument;
        if (!ownerDocument) {
            return;
        }
        this._onDocumentClick = (event) => {
            if (!this.open) {
                return;
            }
            const target = event.target instanceof Node ? event.target : null;
            if (target && (this.contains(target) || this._panelEl()?.contains(target))) {
                return;
            }
            this.closeMenu();
        };
        this._clickDocument = ownerDocument;
        ownerDocument.addEventListener('click', this._onDocumentClick);
    }

    _unbindDocumentClick() {
        if (!this._onDocumentClick) {
            return;
        }
        this._clickDocument?.removeEventListener('click', this._onDocumentClick);
        this._onDocumentClick = null;
        this._clickDocument = null;
    }

    _bindPanel() {
        const panel = this._panelEl();
        if (!panel || this._panelBound === panel) {
            return;
        }
        this._unbindPanel();
        this._onPanelClick = (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const item = target?.closest('[role="treeitem"]');
            if (!item || !panel.contains(item)) {
                return;
            }
            event.stopPropagation();
            this._choose(item.getAttribute('data-entry-id') || '');
        };
        panel.addEventListener('click', this._onPanelClick);
        this._panelBound = panel;
    }

    _unbindPanel() {
        if (this._panelBound && this._onPanelClick) {
            this._panelBound.removeEventListener('click', this._onPanelClick);
        }
        this._onPanelClick = null;
        this._panelBound = null;
    }
}

registerCoreComponent('core-filter-picker', CoreFilterPicker);
