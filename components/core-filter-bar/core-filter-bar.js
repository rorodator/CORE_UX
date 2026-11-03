/**
 * Visual filter bar. Owns a Core_FilterEngine and composes the picker plus editors.
 * Disconnect does not end state$ or events$. Only destroy() does.
 */
import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { Core_FilterEngine } from 'CORE_JS/lib/filter/core-filter-engine.js';
import { Core_FilterError } from 'CORE_JS/lib/filter/core-filter-error.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import {
    createFilterEditor,
    operatorLabel,
    operatorTakesValue,
} from './filter-editor-adapters.js';
import '../core-filter-picker/core-filter-picker.js';
import '../core-menu/core-menu.js';
import '../core-button/core-button.js';

const LAYOUTS = ['wrap', 'scroll', 'vertical'];

export class CoreFilterBar extends Core_UXElement {

    static get observedAttributes() {
        return ['layout', 'disabled'];
    }

    constructor() {
        super();
        /** @type {Core_FilterEngine|null} */
        this._engine = null;
        /** @type {object|null} */
        this._config = null;
        this._focusAfterAdd = true;
        this._revealed = false;
        this._destroyed = false;
        this._painting = false;
        /** @type {{ unsubscribe?: () => void }|null} */
        this._stateSub = null;
        /** @type {{ unsubscribe?: () => void }|null} */
        this._eventsSub = null;
        /** @type {HTMLElement|null} */
        this._root = null;
        /** @type {HTMLElement|null} */
        this._rowsEl = null;
        /** @type {HTMLElement|null} */
        this._picker = null;
        /** @type {HTMLElement|null} */
        this._barError = null;
        /** @type {Map<string, object>} */
        this._rows = new Map();
        /** @type {Set<string>} */
        this._local = new Set();
        /** @type {string} */
        this._dragId = '';
        this._pointerMoved = false;
    }

    onConnect() {
        this._renderShell();
        this._bind();
    }

    onDisconnect() {
        this._unbind();
        this._destroyRows();
    }

    /**
     * @param {string} name
     */
    attributeChangedCallback(name) {
        if (!this.isConnected || !this._root) {
            return;
        }
        if (name === 'layout') {
            this._syncLayout();
        }
        if (name === 'disabled') {
            this._paint();
        }
    }

    /**
     * @param {object} config
     */
    configure(config) {
        const next = new Core_FilterEngine(config || {});
        this._teardownEngine();
        this._config = config || {};
        this._engine = next;
        this._destroyed = false;
        this._revealed = false;
        this._focusAfterAdd = !config?.ui || config.ui.focusAfterAdd !== false;
        if (this.isConnected) {
            if (!this._root) {
                this._renderShell();
            }
            this._bind();
        }
    }

    /** @returns {import('rxjs').Observable<object>} */
    get state$() {
        return this._live().state$;
    }

    /** @returns {import('rxjs').Observable<object>} */
    get events$() {
        return this._live().events$;
    }

    getDefinitions() {
        return this._live().getDefinitions();
    }

    getState() {
        return this._live().getState();
    }

    getCriteria() {
        return this._live().getCriteria();
    }

    getResolvedConfig() {
        return this._live().getResolvedConfig();
    }

    validate() {
        const result = this._live().validate();
        this._revealed = true;
        this._paint();
        return result;
    }

    exportState() {
        return this._live().exportState();
    }

    importState(snapshot) {
        this._revealed = false;
        this._live().importState(snapshot);
    }

    addDefinition(definition) {
        return this._live().addDefinition(definition);
    }

    updateDefinition(id, patch) {
        return this._live().updateDefinition(id, patch);
    }

    removeDefinition(id, options) {
        return this._live().removeDefinition(id, options);
    }

    addFilter(definitionId, options) {
        return this._live().addFilter(definitionId, options);
    }

    removeFilter(instanceId) {
        return this._live().removeFilter(instanceId);
    }

    clearFilter(instanceId) {
        return this._live().clearFilter(instanceId);
    }

    setValue(instanceId, value) {
        return this._live().setValue(instanceId, value);
    }

    setOperator(instanceId, operator) {
        return this._live().setOperator(instanceId, operator);
    }

    moveFilter(instanceId, targetIndex) {
        return this._live().moveFilter(instanceId, targetIndex);
    }

    setPinned(instanceId, pinned) {
        return this._live().setPinned(instanceId, pinned);
    }

    setFilters(filters) {
        return this._live().setFilters(filters);
    }

    reset() {
        this._revealed = false;
        return this._live().reset();
    }

    /**
     * @template T
     * @param {(tx: object) => T} fn
     * @returns {T}
     */
    transaction(fn) {
        return this._live().transaction(fn);
    }

    destroy() {
        if (this._destroyed && !this._engine) {
            return;
        }
        this._destroyed = true;
        this._destroyRows();
        this._unbind();
        this._closeMenus(false);
        this._picker?.closeMenu?.();
        this._engine?.destroy();
    }

    _live() {
        if (!this._engine || this._destroyed) {
            throw new Core_FilterError('E_DESTROYED', 'This filter bar has been destroyed.');
        }
        return this._engine;
    }

    _renderShell() {
        this._destroyRows();
        const root = createElement('div', { className: 'core-filter-bar' });
        const rows = createElement('div', {
            className: 'core-filter-bar__rows',
            attrs: { role: 'list' },
        });
        const picker = document.createElement('core-filter-picker');
        picker.setAttribute('label', 'Add a filter');
        const barError = createElement('p', {
            className: 'core-filter-bar__error',
            attrs: { role: 'alert', 'data-core-filter-bar-error': '' },
        });
        barError.hidden = true;
        root.append(rows, picker, barError);
        this.replaceChildren(root);
        this._root = root;
        this._rowsEl = rows;
        this._picker = picker;
        this._barError = barError;
        picker.addEventListener('core-filter-picker-select', (event) => {
            const definitionId = /** @type {CustomEvent} */ (event).detail?.id;
            if (!definitionId || !this._engine || this._destroyed) {
                return;
            }
            this._setBarError('');
            try {
                this._engine.withSource('user', () => this._engine.addFilter(definitionId));
            } catch (error) {
                this._setBarError(error?.message || 'This filter could not be added.');
            }
        });
        picker.addEventListener('click', () => this._closeMenus(false));
        picker.addEventListener('input', () => this._closeMenus(false));
        this._syncLayout();
    }

    _bind() {
        this._unbind();
        if (!this._engine || this._destroyed) {
            return;
        }
        this._stateSub = this._engine.state$.subscribe(() => this._paint());
        this._eventsSub = this._engine.events$.subscribe((event) => this._onEvent(event));
    }

    _unbind() {
        this._stateSub?.unsubscribe?.();
        this._eventsSub?.unsubscribe?.();
        this._stateSub = null;
        this._eventsSub = null;
    }

    _teardownEngine() {
        this._destroyRows();
        this._unbind();
        this._closeMenus(false);
        this._engine?.destroy();
        this._engine = null;
    }

    /**
     * @param {object} event
     */
    _onEvent(event) {
        if (!event || this._destroyed) {
            return;
        }
        const focus = this._focusAfterAdd
            && event.source === 'user'
            && (event.type === 'filterAdded' || event.type === 'operatorChanged');
        if (focus && event.instanceId) {
            this._rows.get(event.instanceId)?.adapter?.focus?.();
        }
    }

    _paint() {
        if (this._painting || !this._engine || this._destroyed || !this._rowsEl) {
            return;
        }
        this._painting = true;
        try {
            const state = this._engine.getState();
            const definitions = new Map(this._engine.getDefinitions().map((item) => [item.id, item]));
            const registry = this._engine.getResolvedConfig().extensions.registry;
            const locale = this._engine.getResolvedConfig().defaults.locale;
            const mode = this._engine.getResolvedConfig().ui.validationMode;
            const seen = new Set();
            for (const instance of state.filters) {
                seen.add(instance.instanceId);
                const definition = definitions.get(instance.definitionId);
                if (!definition) {
                    continue;
                }
                const signature = `${definition.editor}|${definition.editorRef || ''}|${definition.type}|${instance.operator}`;
                let row = this._rows.get(instance.instanceId);
                if (!row || row.signature !== signature) {
                    row?.adapter?.destroy?.();
                    row?.root?.remove();
                    row = this._buildRow(instance, definition, signature, registry);
                    this._rows.set(instance.instanceId, row);
                }
                placeChild(this._rowsEl, row.root, seen.size - 1);
                const rowMode = definition.validation?.mode || mode;
                this._syncRow(row, instance, definition, state.filters, locale, rowMode);
            }
            for (const [id, row] of this._rows) {
                if (!seen.has(id)) {
                    row.adapter?.destroy?.();
                    row.root?.remove();
                    this._rows.delete(id);
                }
            }
            this._syncPicker(state);
            this._syncLayout();
        } finally {
            this._painting = false;
        }
    }

    /**
     * @param {object} instance
     * @param {object} definition
     * @param {string} signature
     * @param {object} registry
     */
    _buildRow(instance, definition, signature, registry) {
        const root = createElement('div', {
            className: 'core-filter-bar__row',
            attrs: {
                role: 'listitem',
                'data-instance-id': instance.instanceId,
                'data-operator': instance.operator,
            },
        });
        const handle = createElement('button', {
            className: 'core-filter-bar__handle',
            text: '⋮⋮',
            attrs: {
                type: 'button',
                draggable: 'true',
                'aria-label': `Reorder ${definition.label}`,
            },
        });
        const label = createElement('span', {
            className: 'core-filter-bar__label',
            text: definition.label,
        });
        const menu = document.createElement('core-menu');
        menu.setAttribute('label', operatorLabel(instance.operator));
        menu.setAttribute('align', 'start');
        for (const operator of definition.operators || []) {
            const item = document.createElement('core-menu-item');
            item.setAttribute('value', operator);
            item.setAttribute('label', operatorLabel(operator));
            menu.append(item);
        }
        const editorHost = createElement('div', {
            className: 'core-filter-bar__editor',
            attrs: { 'data-core-filter-editor': '' },
        });
        const actions = createElement('div', { className: 'core-filter-bar__actions' });
        const earlier = actionButton('Earlier', 'Move earlier');
        const later = actionButton('Later', 'Move later');
        const clear = actionButton('Clear', 'Clear value');
        const pin = actionButton('', 'Pin');
        pin.setAttribute('icon', 'pin');
        pin.setAttribute('icon-only', '');
        const remove = actionButton('', 'Remove');
        remove.setAttribute('icon', 'close');
        remove.setAttribute('icon-only', '');
        actions.append(earlier, later, clear, pin, remove);
        const error = createElement('p', {
            className: 'core-filter-bar__error',
            attrs: { role: 'alert' },
        });
        error.hidden = true;
        root.append(handle, label, menu, editorHost, actions, error);

        const adapter = createFilterEditor(definition, instance.operator, registry);
        const row = {
            signature,
            root,
            adapter,
            menu,
            handle,
            earlier,
            later,
            clear,
            pin,
            remove,
            error,
            editorHost,
        };
        menu.addEventListener('core-menu-open', () => {
            this._picker?.closeMenu?.();
        });
        menu.addEventListener('core-menu-select', (event) => {
            event.stopPropagation();
            const operator = /** @type {CustomEvent} */ (event).detail?.value;
            if (!operator) {
                return;
            }
            this._user(() => this._engine.setOperator(instance.instanceId, operator));
        });
        earlier.addEventListener('click', () => this._move(instance.instanceId, -1));
        later.addEventListener('click', () => this._move(instance.instanceId, 1));
        clear.addEventListener('click', () => this._user(() => this._engine.clearFilter(instance.instanceId)));
        pin.addEventListener('click', () => {
            const current = this._engine.getState().filters.find((item) => item.instanceId === instance.instanceId);
            if (!current || current.pinLocked) {
                return;
            }
            this._user(() => this._engine.setPinned(instance.instanceId, !current.pinned));
        });
        remove.addEventListener('click', () => {
            const current = this._engine.getState().filters.find((item) => item.instanceId === instance.instanceId);
            if (!current?.removable) {
                return;
            }
            this._user(() => this._engine.removeFilter(instance.instanceId));
        });
        handle.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                event.preventDefault();
                this._move(instance.instanceId, -1);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                event.preventDefault();
                this._move(instance.instanceId, 1);
            }
        });
        handle.addEventListener('dragstart', (event) => {
            this._dragId = instance.instanceId;
            this._pointerMoved = false;
            event.dataTransfer?.setData('text/plain', instance.instanceId);
        });
        handle.addEventListener('pointerdown', (event) => {
            if (event.button != null && event.button !== 0) {
                return;
            }
            this._dragId = instance.instanceId;
            this._pointerMoved = false;
            handle.setPointerCapture?.(event.pointerId);
        });
        handle.addEventListener('pointerup', (event) => {
            const sourceId = this._dragId;
            if (!sourceId) {
                return;
            }
            const doc = handle.ownerDocument;
            const hit = doc?.elementFromPoint?.(event.clientX, event.clientY);
            const target = hit?.closest?.('[data-instance-id]');
            const targetId = target?.getAttribute('data-instance-id') || '';
            if (!targetId || targetId === sourceId) {
                return;
            }
            this._pointerMoved = true;
            this._dropOn(targetId);
        });
        handle.addEventListener('dragend', () => {
            this._dragId = '';
            this._pointerMoved = false;
        });
        root.addEventListener('dragover', (event) => {
            if (this._dragId) {
                event.preventDefault();
            }
        });
        root.addEventListener('drop', (event) => {
            event.preventDefault();
            if (this._pointerMoved) {
                return;
            }
            this._dropOn(instance.instanceId);
        });
        try {
            adapter.mount(editorHost, this._editorContext(instance, definition, [], registry), (change) => {
                this._emitEditor(instance.instanceId, change);
            });
        } catch (error) {
            editorHost.textContent = error?.message || 'This editor could not be created.';
        }
        syncOperatorPicker(menu, definition.operators, instance.operator, () => row.adapter?.focus?.());
        return row;
    }

    /**
     * @param {object} row
     * @param {object} instance
     * @param {object} definition
     * @param {object[]} filters
     * @param {string} locale
     * @param {string} mode
     */
    _syncRow(row, instance, definition, filters, locale, mode) {
        row.root.setAttribute('data-operator', instance.operator);
        const label = definition.label || instance.definitionId;
        const labelNode = row.root.querySelector('.core-filter-bar__label');
        if (labelNode && labelNode.textContent !== label) {
            labelNode.textContent = label;
        }
        row.handle?.setAttribute('aria-label', `Reorder ${label}`);
        syncOperatorPicker(row.menu, definition.operators, instance.operator, () => row.adapter?.focus?.());
        row.root.setAttribute('aria-label', `${label} filter`);
        setDisabled(row.earlier, !this._canMove(instance, -1));
        setDisabled(row.later, !this._canMove(instance, 1));
        const showClear = operatorTakesValue(instance.operator);
        row.clear.hidden = !showClear;
        const pinnable = definition.pinnable !== false;
        row.pin.hidden = !pinnable;
        row.pin.setAttribute('label', instance.pinned ? 'Unpin' : 'Pin');
        row.pin.setAttribute('icon', instance.pinned ? 'pin-off' : 'pin');
        row.pin.setAttribute('aria-pressed', instance.pinned ? 'true' : 'false');
        setDisabled(row.pin, instance.pinLocked);
        row.remove.hidden = instance.removable === false;
        const message = visibleError(instance, mode, this._revealed);
        row.error.textContent = message;
        row.error.hidden = message === '';
        if (this._local.has(instance.instanceId)) {
            return;
        }
        row.adapter?.update?.(this._editorContext(instance, definition, filters, null, locale));
    }

    /**
     * @param {object} instance
     * @param {object} definition
     * @param {object[]} filters
     * @param {object|null} [_registry]
     * @param {string} [locale]
     */
    _editorContext(instance, definition, filters, _registry, locale) {
        const resolved = this._engine.getResolvedConfig();
        return {
            value: instance.value,
            rawValue: instance.rawValue,
            operator: instance.operator,
            definitionId: instance.definitionId,
            instanceId: instance.instanceId,
            errors: instance.errors,
            disabled: this.hasAttribute('disabled') && this.getAttribute('disabled') !== 'false',
            format: definition.format,
            status: instance.status,
            touched: instance.touched,
            selectedLabel: instance.selectedLabel,
            label: definition.label,
            type: definition.type,
            options: definition.options,
            nodes: definition.editorOptions?.nodes,
            editorOptions: definition.editorOptions,
            provider: definition.provider,
            locale: locale || resolved.defaults.locale,
            filters,
            dependencyKey: dependencyKey(filters, instance.instanceId),
            instance,
        };
    }

    /**
     * @param {string} instanceId
     * @param {object} change
     */
    _emitEditor(instanceId, change) {
        if (!this._engine || this._destroyed) {
            return;
        }
        this._local.add(instanceId);
        try {
            this._engine.applyEditorChange(instanceId, change, 'user');
        } finally {
            this._local.delete(instanceId);
        }
    }

    /**
     * @param {object} state
     */
    _syncPicker(state) {
        const picker = this._picker;
        if (!picker || !this._engine) {
            return;
        }
        const config = this._engine.getResolvedConfig();
        const max = config.behavior.maxFilters;
        const full = max != null && state.filters.length >= max;
        if (full) {
            picker.setAttribute('disabled', '');
        } else {
            picker.removeAttribute('disabled');
        }
        picker.setEntries(this._engine.getDefinitions().map((definition) => ({
            id: definition.id,
            label: definition.label,
            description: definition.description,
            keywords: definition.keywords,
            group: definition.group,
            groupPath: definition.groupPath,
            visible: definition.visible,
            disabled: full || definition.disabled === true || this._catalogBlocked(definition, state),
        })));
    }

    /**
     * @param {object} definition
     * @param {object} state
     * @returns {boolean}
     */
    _catalogBlocked(definition, state) {
        const count = state.filters.filter((item) => item.definitionId === definition.id).length;
        if (!definition.allowMultipleInstances && count > 0) {
            return true;
        }
        if (definition.maxInstances != null && count >= definition.maxInstances) {
            return true;
        }
        return false;
    }

    /**
     * @param {string} instanceId
     * @param {number} delta
     */
    _move(instanceId, delta) {
        const filters = this._engine?.getState().filters || [];
        const index = filters.findIndex((item) => item.instanceId === instanceId);
        if (index < 0) {
            return;
        }
        const target = index + delta;
        if (!this._insideGroup(filters[index], target, filters)) {
            return;
        }
        this._user(() => this._engine.moveFilter(instanceId, target));
    }

    /**
     * @param {string} targetId
     */
    _dropOn(targetId) {
        const sourceId = this._dragId;
        this._dragId = '';
        if (!sourceId || sourceId === targetId || !this._engine) {
            return;
        }
        const filters = this._engine.getState().filters;
        const target = filters.findIndex((item) => item.instanceId === targetId);
        const source = filters.find((item) => item.instanceId === sourceId);
        if (!source || target < 0 || !this._insideGroup(source, target, filters)) {
            return;
        }
        this._user(() => this._engine.moveFilter(sourceId, target));
    }

    /**
     * @param {object} instance
     * @param {number} delta
     * @returns {boolean}
     */
    _canMove(instance, delta) {
        const filters = this._engine?.getState().filters || [];
        const index = filters.findIndex((item) => item.instanceId === instance.instanceId);
        if (index < 0) {
            return false;
        }
        return this._insideGroup(filters[index], index + delta, filters);
    }

    /**
     * @param {object} instance
     * @param {number} target
     * @param {object[]} filters
     * @returns {boolean}
     */
    _insideGroup(instance, target, filters) {
        if (target < 0 || target >= filters.length) {
            return false;
        }
        const allow = this._engine.getResolvedConfig().behavior.allowCrossGroupMove === true;
        if (allow) {
            return true;
        }
        const pinnedCount = filters.filter((item) => item.pinned).length;
        const start = instance.pinned ? 0 : pinnedCount;
        const end = instance.pinned ? pinnedCount - 1 : filters.length - 1;
        return target >= start && target <= end;
    }

    /**
     * @param {() => unknown} fn
     */
    _user(fn) {
        if (!this._engine || this._destroyed) {
            return undefined;
        }
        try {
            return this._engine.withSource('user', fn);
        } catch (error) {
            this._setBarError(error?.message || 'This change was rejected.');
            return undefined;
        }
    }

    /**
     * @param {boolean} restoreFocus
     */
    _closeMenus(restoreFocus) {
        this._rowsEl?.querySelectorAll('core-menu').forEach((menu) => {
            if (typeof menu._closeMenu === 'function') {
                menu._closeMenu({ restoreFocus, emitEvent: true });
            } else if (menu.open) {
                menu.closeMenu();
            }
        });
    }

    _syncLayout() {
        if (!this._root) {
            return;
        }
        const layout = this._layoutName();
        this._root.classList.remove('core-filter-bar--wrap', 'core-filter-bar--scroll', 'core-filter-bar--vertical');
        this._root.classList.add(`core-filter-bar--${layout}`);
    }

    /**
     * @returns {'wrap'|'scroll'|'vertical'}
     */
    _layoutName() {
        const attr = this.getAttribute('layout');
        if (LAYOUTS.includes(attr)) {
            return /** @type {'wrap'|'scroll'|'vertical'} */ (attr);
        }
        const layout = this._engine?.getResolvedConfig?.().ui.layout;
        return LAYOUTS.includes(layout) ? layout : 'wrap';
    }

    /**
     * @param {string} message
     */
    _setBarError(message) {
        if (!this._barError) {
            return;
        }
        this._barError.textContent = message;
        this._barError.hidden = message === '';
    }

    _destroyRows() {
        for (const row of this._rows.values()) {
            row.adapter?.destroy?.();
            row.root?.remove();
        }
        this._rows.clear();
    }
}

/**
 * @param {string[]|undefined} operators
 * @returns {boolean}
 */
function operatorPickerVisible(operators) {
    return Array.isArray(operators) && operators.length > 1;
}

/**
 * @param {HTMLElement} menu
 * @returns {boolean}
 */
function operatorMenuOwnsFocus(menu) {
    const doc = menu.ownerDocument;
    const active = doc?.activeElement;
    if (!active) {
        return false;
    }
    const trigger = menu.querySelector('[data-core-menu-trigger]');
    if (trigger && (active === trigger || trigger.contains(active))) {
        return true;
    }
    const panel = doc.getElementById(menu.panelId);
    return Boolean(panel && (active === panel || panel.contains(active)));
}

/**
 * Hides the operator menu when the definition allows only one choice.
 * @param {HTMLElement|null|undefined} menu
 * @param {string[]|undefined} operators
 * @param {string} current
 * @param {(() => void)|undefined} focusEditor
 */
function syncOperatorPicker(menu, operators, current, focusEditor) {
    if (!menu) {
        return;
    }
    const visible = operatorPickerVisible(operators);
    menu.hidden = !visible;
    if (!visible) {
        if (menu.open) {
            const restoreEditor = operatorMenuOwnsFocus(menu);
            if (typeof menu._closeMenu === 'function') {
                menu._closeMenu({ restoreFocus: false, emitEvent: true });
            } else {
                menu.closeMenu?.();
            }
            if (restoreEditor) {
                focusEditor?.();
            }
        }
        return;
    }
    syncOperatorMenu(menu, operators, current);
}

/**
 * Refresh the operator menu in place. An unchanged list keeps the open panel.
 * @param {HTMLElement|null|undefined} menu
 * @param {string[]} operators
 * @param {string} current
 */
function syncOperatorMenu(menu, operators, current) {
    if (!menu) {
        return;
    }
    const wanted = Array.isArray(operators) ? operators : [];
    const label = operatorLabel(current);
    if ((menu.label || '') !== label) {
        menu.setLabel?.(label);
    }
    const items = operatorMenuItems(menu);
    const present = items.map((item) => item.getAttribute('value'));
    const same = present.length === wanted.length && present.every((value, index) => value === wanted[index]);
    if (same) {
        return;
    }
    for (const item of items) {
        item.remove();
    }
    for (const operator of wanted) {
        const item = document.createElement('core-menu-item');
        item.setAttribute('value', operator);
        item.setAttribute('label', operatorLabel(operator));
        menu.append(item);
    }
    menu.refresh?.();
}

/**
 * Items of the operator menu, including the panel portaled onto the document.
 * A query from the host misses that panel and would append a second copy.
 * @param {HTMLElement} menu
 * @returns {HTMLElement[]}
 */
function operatorMenuItems(menu) {
    const panelId = menu.panelId;
    const panel = (panelId && menu.ownerDocument?.getElementById(panelId))
        || menu.querySelector('.core-menu__panel');
    /** @type {HTMLElement[]} */
    const items = [];
    if (panel) {
        for (const child of panel.children) {
            if (child.localName === 'core-menu-item') {
                items.push(/** @type {HTMLElement} */ (child));
            }
        }
    }
    for (const child of menu.children) {
        if (child.localName === 'core-menu-item' && !items.includes(child)) {
            items.push(/** @type {HTMLElement} */ (child));
        }
    }
    return items;
}

/**
 * Move a row only when its position changed. Re-appending a child disconnects it.
 * @param {HTMLElement} parent
 * @param {HTMLElement} node
 * @param {number} index
 */
function placeChild(parent, node, index) {
    if (parent.children[index] === node) {
        return;
    }
    parent.insertBefore(node, parent.children[index] || null);
}

/**
 * @param {string} label
 * @param {string} [name]
 * @returns {HTMLElement}
 */
function actionButton(label, name = label) {
    const button = document.createElement('core-button');
    button.setAttribute('variant', 'ghost');
    button.setAttribute('size', 'sm');
    button.setAttribute('label', name || label);
    return button;
}

/**
 * @param {HTMLElement} button
 * @param {boolean} disabled
 */
function setDisabled(button, disabled) {
    if (disabled) {
        button.setAttribute('disabled', '');
    } else {
        button.removeAttribute('disabled');
    }
}

/**
 * @param {object[]} filters
 * @param {string} instanceId
 * @returns {string}
 */
function dependencyKey(filters, instanceId) {
    return JSON.stringify((filters || [])
        .filter((item) => item.instanceId !== instanceId)
        .map((item) => [item.instanceId, item.operator, item.value, item.status]));
}

/**
 * @param {object} instance
 * @param {string} mode
 * @param {boolean} revealed
 * @returns {string}
 */
function visibleError(instance, mode, revealed) {
    const errors = Array.isArray(instance.errors) ? instance.errors : [];
    if (errors.length === 0) {
        return '';
    }
    if (mode === 'manual' && !revealed) {
        return '';
    }
    if (mode === 'touched' && !instance.touched) {
        return '';
    }
    return errors.map((error) => error.message || error.code).filter(Boolean).join(' ');
}

registerCoreComponent('core-filter-bar', CoreFilterBar);
