import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountTrustedHtml } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Responsive centred container — sizes: sm | md | lg | xl | fluid.
 */
export class CoreContainer extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['size'];
    }

    attributeChangedCallback() {
        this.slotAttributeChanged();
    }

    get sizeClass() {
        const size = this.getAttribute('size');
        const map = {
            sm: 'core-container--sm',
            md: 'core-container--md',
            lg: 'core-container--lg',
            xl: 'core-container--xl',
            fluid: 'core-container--fluid'
        };
        return map[size] || 'core-container--lg';
    }

    ui_render() {
        const container = createElement('div', {
            className: `core-container ${this.sizeClass}`.trim()
        });
        mountTrustedHtml(container, this._slotContent);
        this.replaceChildren(container);
    }
}

registerCoreComponent('core-container', CoreContainer);
