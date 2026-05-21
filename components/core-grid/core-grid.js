import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountHtml } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Responsive CSS grid.
 */
export class CoreGrid extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['cols'];
    }

    attributeChangedCallback() {
        this.slotAttributeChanged();
    }

    ui_render() {
        const cols = this.getAttribute('cols') || 'auto';
        const map = {
            '1': 'core-grid--1',
            '2': 'core-grid--2',
            '3': 'core-grid--3',
            '4': 'core-grid--4',
            auto: 'core-grid--auto'
        };
        const grid = createElement('div', {
            className: `core-grid ${map[cols] || 'core-grid--auto'}`.trim()
        });
        mountHtml(grid, this._slotContent);
        this.replaceChildren(grid);
    }
}

registerCoreComponent('core-grid', CoreGrid);
