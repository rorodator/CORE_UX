import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Tab label marker — declarative child of {@link CoreTabs} (captured on first render).
 * Hidden via CSS until ingested by the parent.
 */
export class CoreTab extends Core_UXElement {

    static get observedAttributes() {
        return ['value', 'label', 'disabled'];
    }
}

registerCoreComponent('core-tab', CoreTab);
