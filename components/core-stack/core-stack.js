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
        const allowedGaps = ['1', '2', '3', '4', '5', '6', '8'];
        const gapClass = `core-stack--gap-${allowedGaps.includes(gap) ? gap : '4'}`;
        const align = this.getAttribute('align');
        const allowedAlignments = ['start', 'center', 'end', 'stretch'];
        const alignClass = allowedAlignments.includes(align) ? `core-stack--align-${align}` : '';
        const justify = this.getAttribute('justify');
        const allowedJustifications = ['start', 'center', 'end', 'between'];
        const justifyClass = allowedJustifications.includes(justify)
            ? `core-stack--justify-${justify}`
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
