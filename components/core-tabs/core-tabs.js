import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, mountTrustedHtml, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import './core-tab.js';
import './core-tab-panel.js';

/**
 * Accessible tablist with declarative {@link CoreTab} / {@link CoreTabPanel} children.
 */
export class CoreTabs extends Core_UXElement {

    static get observedAttributes() {
        return ['value', 'layout'];
    }

    constructor() {
        super();
        /** @type {Array<{ value: string, label: string, disabled: boolean }>} */
        this._tabs = [];
        /** @type {Map<string, string>} */
        this._panels = new Map();
        /** @type {boolean} */
        this._captured = false;
        this._uid = Math.random().toString(36).slice(2, 9);
    }

    onConnect() {
        if (!this._captured) {
            this._captureStructure();
            this._captured = true;
        }
        this.render();
    }

    attributeChangedCallback(name) {
        if (!this.isConnected || !this._captured) {
            return;
        }
        if (name === 'value') {
            this._syncActive();
            return;
        }
        if (name === 'layout') {
            this.render();
        }
    }

    get value() {
        return this.getAttribute('value') || this._tabs[0]?.value || '';
    }

    get layoutClass() {
        const layout = this.getAttribute('layout');
        return layout === 'underline' ? 'core-tabs--underline' : 'core-tabs--pills';
    }

    get tablistId() {
        return `${this.id || `core-tabs-${this._uid}`}-tablist`;
    }

    /**
     * Reads declarative light-DOM children once before the first render.
     */
    _captureStructure() {
        const tabs = [];
        const panels = new Map();

        Array.from(this.children).forEach((child) => {
            if (child.localName === 'core-tab') {
                const value = child.getAttribute('value') || '';
                if (!value) {
                    return;
                }
                tabs.push({
                    value,
                    label: child.getAttribute('label') || child.textContent.trim(),
                    disabled: hasBoolAttr(child, 'disabled'),
                });
                return;
            }
            if (child.localName === 'core-tab-panel') {
                const value = child.getAttribute('value') || '';
                if (value) {
                    panels.set(value, child.innerHTML);
                }
            }
        });

        this._tabs = tabs;
        this._panels = panels;
    }

    ui_render() {
        const wrap = createElement('div', { className: `core-tabs ${this.layoutClass}`.trim() });

        const tablist = createElement('div', {
            className: 'core-tabs__list',
            attrs: { role: 'tablist', id: this.tablistId },
        });

        this._tabs.forEach((tab) => {
            const isActive = tab.value === this.value;
            const tabId = `${this.tablistId}-tab-${tab.value}`;
            const panelId = `${this.tablistId}-panel-${tab.value}`;
            tablist.appendChild(createElement('button', {
                className: `core-tabs__tab${isActive ? ' core-tabs__tab--active' : ''}`,
                text: tab.label,
                attrs: {
                    type: 'button',
                    role: 'tab',
                    id: tabId,
                    'data-core-tabs-value': tab.value,
                    'aria-selected': isActive ? 'true' : 'false',
                    'aria-controls': panelId,
                    tabindex: isActive ? '0' : '-1',
                    disabled: tab.disabled || false,
                },
            }));
        });
        wrap.appendChild(tablist);

        this._tabs.forEach((tab) => {
            const isActive = tab.value === this.value;
            const panelId = `${this.tablistId}-panel-${tab.value}`;
            const tabId = `${this.tablistId}-tab-${tab.value}`;
            const panel = createElement('div', {
                className: 'core-tabs__panel',
                attrs: {
                    role: 'tabpanel',
                    id: panelId,
                    'aria-labelledby': tabId,
                    'data-core-tabs-panel': tab.value,
                    hidden: !isActive || undefined,
                },
            });
            mountTrustedHtml(panel, this._panels.get(tab.value) || '');
            wrap.appendChild(panel);
        });

        this.replaceChildren(wrap);
    }

    /**
     * Updates active tab and panel visibility without rebuilding slot content.
     */
    _syncActive() {
        const value = this.value;
        this.querySelectorAll('[data-core-tabs-value]').forEach((btn) => {
            const active = btn.getAttribute('data-core-tabs-value') === value;
            btn.classList.toggle('core-tabs__tab--active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
            btn.tabIndex = active ? 0 : -1;
        });
        this.querySelectorAll('[data-core-tabs-panel]').forEach((panel) => {
            const active = panel.getAttribute('data-core-tabs-panel') === value;
            panel.toggleAttribute('hidden', !active);
        });
    }

    /**
     * @param {string} nextValue
     * @param {{ emit?: boolean }} [options]
     */
    _selectValue(nextValue, options = {}) {
        const { emit = true } = options;
        if (!nextValue || nextValue === this.value) {
            return;
        }
        const tab = this._tabs.find((item) => item.value === nextValue);
        if (!tab || tab.disabled) {
            return;
        }
        const previousValue = this.value;
        this.setAttribute('value', nextValue);
        this._syncActive();
        if (emit) {
            this.dispatchEvent(new CustomEvent('core-tabs-change', {
                bubbles: true,
                detail: { value: nextValue, previousValue },
            }));
        }
    }

    /**
     * Updates a tab label after capture (e.g. i18n refresh).
     *
     * @param {string} value Tab value key.
     * @param {string} label New visible label.
     */
    setTabLabel(value, label) {
        const tab = this._tabs.find((item) => item.value === value);
        if (!tab) {
            return;
        }
        tab.label = label;
        const button = this.querySelector(`[data-core-tabs-value="${value}"]`);
        if (button) {
            button.textContent = label;
        }
    }

    ui_toFunctional() {
        this.bindDelegated('click', '[data-core-tabs-value]', (event, btn) => {
            if (btn.disabled) {
                return;
            }
            event.preventDefault();
            this._selectValue(btn.getAttribute('data-core-tabs-value') || '');
        });

        this.bindUI('keydown', (event) => {
            const tabs = this.querySelectorAll('[data-core-tabs-value]');
            if (!tabs.length) {
                return;
            }
            const enabled = Array.from(tabs).filter((tab) => !tab.disabled);
            if (!enabled.length) {
                return;
            }
            const currentIndex = enabled.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
            let nextIndex = currentIndex;

            switch (event.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    event.preventDefault();
                    nextIndex = currentIndex <= 0 ? enabled.length - 1 : currentIndex - 1;
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    event.preventDefault();
                    nextIndex = currentIndex >= enabled.length - 1 ? 0 : currentIndex + 1;
                    break;
                case 'Home':
                    event.preventDefault();
                    nextIndex = 0;
                    break;
                case 'End':
                    event.preventDefault();
                    nextIndex = enabled.length - 1;
                    break;
                default:
                    return;
            }

            const target = enabled[nextIndex];
            target.focus();
            this._selectValue(target.getAttribute('data-core-tabs-value') || '');
        });
    }
}

registerCoreComponent('core-tabs', CoreTabs);
