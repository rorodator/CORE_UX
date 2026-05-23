import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountTrustedHtml } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Flex stack — responsive row on sm+ when direction=row.
 */
export class CoreStack extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['direction', 'gap', 'align', 'justify'];
    }

    attributeChangedCallback() {
        this.slotAttributeChanged();
    }

    ui_render() {
        const direction = this.getAttribute('direction') === 'row' ? 'row' : 'col';
        const gap = this.getAttribute('gap') || '4';
        const allowedGaps = ['1', '2', '3', '4', '6'];
        const gapClass = `core-stack--gap-${allowedGaps.includes(gap) ? gap : '4'}`;
        const alignClass = this.getAttribute('align') === 'center' ? 'core-stack--align-center' : '';
        const justifyClass = this.getAttribute('justify') === 'between'
            ? 'core-stack--justify-between'
            : '';

        const stack = createElement('div', {
            className: ['core-stack', `core-stack--${direction}`, gapClass, alignClass, justifyClass]
                .filter(Boolean)
                .join(' ')
        });
        mountTrustedHtml(stack, this._slotContent);
        this.replaceChildren(stack);
    }
}

registerCoreComponent('core-stack', CoreStack);
