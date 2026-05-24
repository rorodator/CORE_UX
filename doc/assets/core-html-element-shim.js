/**
 * Minimal Core_HTMLElement for static doc demos (no full CORE_JS bootstrap).
 */
export class Core_HTMLElement extends HTMLElement {

    constructor() {
        super();
        /** @type {Array<{ unsubscribe?: () => void }>} */
        this._subs = [];
        /** @type {AbortController|null} */
        this._uiAbort = null;
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

    cleanFunctional() {
        if (this._uiAbort) {
            this._uiAbort.abort();
            this._uiAbort = null;
        }
    }

    /**
     * @returns {AbortSignal}
     */
    _getUiSignal() {
        if (!this._uiAbort) {
            this._uiAbort = new AbortController();
        }
        return this._uiAbort.signal;
    }

    /**
     * @param {string} type
     * @param {EventListener} handler
     * @param {AddEventListenerOptions} [options]
     */
    bindUI(type, handler, options = {}) {
        const { signal: _ignored, ...rest } = options;
        this.addEventListener(type, handler, { ...rest, signal: this._getUiSignal() });
    }

    /**
     * @param {string} type
     * @param {string} selector
     * @param {(event: Event, match: Element) => void} handler
     * @param {AddEventListenerOptions} [options]
     */
    bindDelegated(type, selector, handler, options = {}) {
        const { signal: _ignored, ...rest } = options;
        this.addEventListener(type, (event) => {
            const match = event.target instanceof Element ? event.target.closest(selector) : null;
            if (match) {
                handler.call(this, event, match);
            }
        }, { ...rest, signal: this._getUiSignal() });
    }

    ui_render() {
        /* Default: clear only — subclasses inject via createElement / mountTrustedHtml */
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
