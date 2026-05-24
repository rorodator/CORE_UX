import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Tab panel marker — declarative child of {@link CoreTabs} (content captured on first render).
 * Hidden via CSS until ingested by the parent.
 */
export class CoreTabPanel extends Core_UXElement {

    static get observedAttributes() {
        return ['value'];
    }
}

registerCoreComponent('core-tab-panel', CoreTabPanel);
