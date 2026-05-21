/**
 * Minimal Core_HTMLElement for static doc demos (no full CORE_JS bootstrap).
 */
export class Core_HTMLElement extends HTMLElement {

    constructor() {
        super();
        /** @type {Array<{ unsubscribe?: () => void }>} */
        this._subs = [];
        this.langContainer = null;
        this._reuseMode = false;
    }

    connectedCallback() {
        if (!this._reuseMode) {
            this.onConnect();
        }
    }

    disconnectedCallback() {
        if (!this._reuseMode) {
            this.onDisconnect();
            this._subs.forEach((sub) => sub?.unsubscribe?.());
            this._subs = [];
            this.cleanFunctional();
        }
    }

    /**
     * @param {{ unsubscribe?: () => void }} sub
     */
    addSub(sub) {
        this._subs.push(sub);
        return sub;
    }

    render() {
        this.cleanFunctional();
        this.ui_render();
        try {
            if (typeof $svc === 'function' && $svc('default')?.lang?.isActivated) {
                $svc('lang').process(this);
            }
        } catch (_) {
            /* lang optional in doc */
        }
        this.ui_toFunctional();
    }

    cleanFunctional() {}

    ui_render() {
        this.innerHTML = '';
    }

    ui_toFunctional() {}

    onConnect() {}

    onDisconnect() {}

    detach() {
        this._reuseMode = true;
        this.onDetach();
    }

    onDetach() {}

    attach() {
        this._reuseMode = false;
        this.onReattach();
    }

    onReattach() {}

    forceDestroy() {
        this._reuseMode = false;
        this.disconnectedCallback();
    }

    get isInReuseMode() {
        return this._reuseMode;
    }
}
