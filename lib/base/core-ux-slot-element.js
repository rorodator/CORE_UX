import { Core_UXElement } from './core-ux-element.js';
import { createElement, mountHtml } from '../utils/dom.js';

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
            this._slotContent = this.innerHTML.trim();
            this._slotCaptured = true;
        }
    }

    /**
     * @param {string} className
     * @returns {HTMLElement}
     */
    createSlotContainer(className) {
        const container = createElement('div', { className });
        mountHtml(container, this._slotContent);
        return container;
    }
}
