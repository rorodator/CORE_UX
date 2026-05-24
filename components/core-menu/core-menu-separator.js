import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Non-interactive menu separator — declarative child of {@link CoreMenu}.
 */
export class CoreMenuSeparator extends Core_UXElement {

    onConnect() {
        this.render();
    }

    ui_render() {
        this.replaceChildren(createElement('div', {
            className: 'core-menu__separator',
            attrs: { role: 'separator', 'aria-orientation': 'horizontal' },
        }));
    }
}

registerCoreComponent('core-menu-separator', CoreMenuSeparator);
