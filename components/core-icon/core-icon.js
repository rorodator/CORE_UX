import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createCoreIconSvg } from '../../lib/icons/core-icon-catalog.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Semantic icon glyph — presentation only, inherits currentColor.
 */
export class CoreIcon extends Core_UXElement {

    static get observedAttributes() {
        return ['name', 'size'];
    }

    onConnect() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get iconName() {
        return this.getAttribute('name') || '';
    }

    get iconSize() {
        const value = Number(this.getAttribute('size'));
        return Number.isFinite(value) && value > 0 ? value : 16;
    }

    ui_render() {
        const svg = createCoreIconSvg(this.iconName, { size: this.iconSize });
        const root = document.createElement('span');
        root.className = 'core-icon';
        root.setAttribute('aria-hidden', 'true');
        if (svg) {
            root.appendChild(svg);
        }
        this.replaceChildren(root);
    }
}

registerCoreComponent('core-icon', CoreIcon);
