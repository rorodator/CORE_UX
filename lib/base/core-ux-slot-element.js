import { Core_UXElement } from './core-ux-element.js';
import { createElement, mountTrustedHtml } from 'CORE_JS/lib/utils/dom.js';
import { readTrustedLightDom } from '../dom/trusted-html.js';

/**
 * UX element that preserves light-DOM children as slot content across renders.
 */
export class Core_UXSlotElement extends Core_UXElement {

    constructor() {
        super();
        /** @type {string} */
        this._slotContent = '';
        this._slotCaptured = false;
    }

    onConnect() {
        this.captureSlot();
        this.render();
    }

    /**
     * Re-render when observed attributes change. Skips until light DOM is captured
     * (attributeChangedCallback can run before connectedCallback).
     */
    slotAttributeChanged() {
        if (this.isConnected && this._slotCaptured) {
            this.render();
        }
    }

    render() {
        if (!this._slotCaptured) {
            return;
        }
        super.render();
    }

    captureSlot() {
        if (!this._slotCaptured) {
            this._slotContent = readTrustedLightDom(this);
            this._slotCaptured = true;
        }
    }

    /**
     * @param {string} className
     * @returns {HTMLElement}
     */
    createSlotContainer(className) {
        const container = createElement('div', { className });
        mountTrustedHtml(container, this._slotContent);
        return container;
    }
}
