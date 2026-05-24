import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr, mountTrustedHtml } from 'CORE_JS/lib/utils/dom.js';
import { readTrustedLightDom } from '../../lib/dom/trusted-html.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Interactive menu entry — button menuitem inside {@link CoreMenu}.
 */
export class CoreMenuItem extends Core_UXElement {

    static get observedAttributes() {
        return ['value', 'label', 'disabled'];
    }

    constructor() {
        super();
        /** @type {string} */
        this._slotContent = '';
        /** @type {boolean} */
        this._slotCaptured = false;
    }

    onConnect() {
        this._captureSlot();
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get value() {
        return this.getAttribute('value') || '';
    }

    /**
     * Captures author light-DOM markup once (icons, rich labels).
     */
    _captureSlot() {
        if (this._slotCaptured) {
            return;
        }
        this._slotContent = readTrustedLightDom(this);
        this._slotCaptured = true;
    }

    ui_render() {
        const btnAttrs = {
            type: 'button',
            role: 'menuitem',
            'data-core-menu-item': true,
            'data-value': this.value,
            tabindex: '-1',
            disabled: hasBoolAttr(this, 'disabled') || undefined,
        };

        if (this.langDecl) {
            btnAttrs['data-core-lang'] = this.langDecl;
        }

        const btn = createElement('button', {
            className: 'core-menu__item',
            attrs: btnAttrs,
        });

        if( this.langDecl ) {
            btn.setAttribute('data-core-lang', this.langDecl);
        }
        
        if (this._slotContent) {
            const labelEl = createElement('span', {
                className: 'core-menu__item-label',
                attrs: { 'data-core-menu-item-label': true },
            });
            mountTrustedHtml(labelEl, this._slotContent);
            btn.appendChild(labelEl);
        } else if (!this.langDecl && this.getAttribute('label')) {
            btn.textContent = this.getAttribute('label') || '';
        }

        this.replaceChildren(btn);
    }

    ui_toFunctional() {
        this.bindDelegated('click', '[data-core-menu-item]', (event) => {
            if (hasBoolAttr(this, 'disabled')) {
                return;
            }
            event.preventDefault();
            this.dispatchEvent(new CustomEvent('core-menu-item-select', {
                bubbles: true,
                detail: { value: this.value },
            }));
        });
    }
}

registerCoreComponent('core-menu-item', CoreMenuItem);
