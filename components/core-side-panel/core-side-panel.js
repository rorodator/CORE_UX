import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountTrustedHtml, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { parseTrustedHtmlFragment, readTrustedLightDom } from '../../lib/dom/trusted-html.js';
import { OverlayFocusController } from '../../lib/overlays/overlay-focus-controller.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Side panel (drawer). Open with `open` attribute. Position: left | right | top | bottom.
 */
export class CoreSidePanel extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['open', 'title', 'position', 'size', 'aria-label'];
    }

    constructor() {
        super();
        this._footerContent = '';
        this._uid = Math.random().toString(36).slice(2, 9);
        this._nameWarningShown = false;
        this._focusController = new OverlayFocusController({
            getDialog: () => this.querySelector('.core-side-panel'),
            onEscape: () => this._close('escape')
        });
    }

    onConnect() {
        if (!this._slotCaptured) {
            this._captureParts();
            this._slotCaptured = true;
        }
        this.render();
        this._syncOpen();
    }

    onDisconnect() {
        this._focusController.deactivate();
    }

    attributeChangedCallback(name) {
        if (!this.isConnected) {
            return;
        }
        if (name === 'open') {
            this._syncOpen();
            return;
        }
        if (!this._slotCaptured) {
            return;
        }
        if (name === 'title') {
            this._syncTitle();
            return;
        }
        if (name === 'position') {
            this._syncPosition();
            return;
        }
        if (name === 'size') {
            this._syncSize();
            return;
        }
        if (name === 'aria-label') {
            this._syncAccessibleName();
        }
    }

    _captureParts() {
        const temp = parseTrustedHtmlFragment(readTrustedLightDom(this));
        const footer = temp.querySelector('[data-core-footer]');
        if (footer) {
            this._footerContent = footer.innerHTML;
            footer.remove();
        }
        this._slotContent = temp.innerHTML.trim();
    }

    get open() {
        return hasBoolAttr(this, 'open');
    }

    get title() {
        return (this.getAttribute('title') || '').trim();
    }

    get accessibleLabel() {
        return (this.getAttribute('aria-label') || '').trim();
    }

    get panelId() {
        return this.getAttribute('id') || `core-side-panel-${this._uid}`;
    }

    get position() {
        const value = (this.getAttribute('position') || 'right').toLowerCase();
        if (value === 'left' || value === 'top' || value === 'bottom') {
            return value;
        }
        return 'right';
    }

    get sizeClass() {
        const size = this.getAttribute('size');
        if (size === 'sm' || size === 'lg' || size === 'full') {
            return `core-side-panel--${size}`;
        }
        return 'core-side-panel--md';
    }

    ui_render() {
        const host = createElement('div', {
            className: 'core-side-panel-host',
            attrs: { hidden: true, role: 'presentation' }
        });
        host.appendChild(createElement('div', {
            className: 'core-side-panel-backdrop',
            attrs: { 'data-core-side-panel-backdrop': true }
        }));

        const panelClasses = [
            'core-side-panel',
            `core-side-panel--${this.position}`,
            this.sizeClass
        ].join(' ');

        const panelAttrs = {
            role: 'dialog',
            'aria-modal': 'true'
        };
        if (this.title) {
            panelAttrs['aria-labelledby'] = `${this.panelId}-title`;
        } else if (this.accessibleLabel) {
            panelAttrs['aria-label'] = this.accessibleLabel;
        }

        const panel = createElement('aside', { className: panelClasses, attrs: panelAttrs });

        const header = createElement('header', { className: 'core-side-panel__header' });
        if (this.title) {
            header.appendChild(createElement('h2', {
                className: 'core-side-panel__title',
                text: this.title,
                attrs: { id: `${this.panelId}-title` }
            }));
        }
        header.appendChild(createElement('button', {
            className: 'core-side-panel__close',
            text: '\u00D7',
            attrs: {
                type: 'button',
                'data-core-side-panel-close': true,
                'aria-label': 'Close'
            }
        }));
        panel.appendChild(header);

        const body = createElement('div', { className: 'core-side-panel__body' });
        mountTrustedHtml(body, this._slotContent);
        panel.appendChild(body);

        if (this._footerContent) {
            const footer = createElement('footer', { className: 'core-side-panel__footer' });
            mountTrustedHtml(footer, this._footerContent);
            panel.appendChild(footer);
        }

        host.appendChild(panel);
        this.replaceChildren(host);
        this._warnIfUnnamed();
    }

    /**
     * Updates the panel title without rebuilding body/footer slot content.
     */
    _syncTitle() {
        const panel = this.querySelector('.core-side-panel');
        const header = panel?.querySelector('.core-side-panel__header');
        if (!panel || !header) {
            this.render();
            return;
        }

        const title = this.title;
        let titleEl = header.querySelector('.core-side-panel__title');
        if (title) {
            panel.setAttribute('aria-labelledby', `${this.panelId}-title`);
            panel.removeAttribute('aria-label');
            if (titleEl) {
                titleEl.textContent = title;
            } else {
                titleEl = createElement('h2', {
                    className: 'core-side-panel__title',
                    text: title,
                    attrs: { id: `${this.panelId}-title` }
                });
                header.insertBefore(titleEl, header.firstChild);
            }
            return;
        }

        panel.removeAttribute('aria-labelledby');
        titleEl?.remove();
        this._syncAccessibleName();
    }

    /**
     * Mirrors the host aria-label when no visible title names the panel.
     */
    _syncAccessibleName() {
        const panel = this.querySelector('.core-side-panel');
        if (!panel) {
            return;
        }
        if (this.title) {
            panel.setAttribute('aria-labelledby', `${this.panelId}-title`);
            panel.removeAttribute('aria-label');
            return;
        }

        panel.removeAttribute('aria-labelledby');
        if (this.accessibleLabel) {
            panel.setAttribute('aria-label', this.accessibleLabel);
            return;
        }
        panel.removeAttribute('aria-label');
        this._warnIfUnnamed();
    }

    _warnIfUnnamed() {
        if (this.title || this.accessibleLabel || this._nameWarningShown) {
            return;
        }
        this._nameWarningShown = true;
        console.warn('<core-side-panel> requires a non-empty title or aria-label.');
    }

    /**
     * Updates panel position classes without rebuilding slot content.
     */
    _syncPosition() {
        const panel = this.querySelector('.core-side-panel');
        if (!panel) {
            this.render();
            return;
        }
        panel.classList.remove(
            'core-side-panel--left',
            'core-side-panel--right',
            'core-side-panel--top',
            'core-side-panel--bottom'
        );
        panel.classList.add(`core-side-panel--${this.position}`);
    }

    /**
     * Updates panel size classes without rebuilding slot content.
     */
    _syncSize() {
        const panel = this.querySelector('.core-side-panel');
        if (!panel) {
            this.render();
            return;
        }
        panel.classList.remove(
            'core-side-panel--sm',
            'core-side-panel--md',
            'core-side-panel--lg',
            'core-side-panel--full'
        );
        panel.classList.add(this.sizeClass);
    }

    _syncOpen() {
        const host = this.querySelector('.core-side-panel-host');
        if (this.open) {
            if (!host) {
                return;
            }
            host.removeAttribute('hidden');
            host.classList.add('core-side-panel-host--open');
            this._focusController.activate();
        } else {
            host?.classList.remove('core-side-panel-host--open');
            host?.setAttribute('hidden', '');
            this._focusController.deactivate();
        }
    }

    /**
     * @param {string} reason
     */
    _close(reason) {
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('core-side-panel-close', {
            bubbles: true,
            detail: { reason }
        }));
    }

    ui_toFunctional() {
        this.bindDelegated('click', '[data-core-side-panel-backdrop]', () => this._close('backdrop'));
        this.bindDelegated('click', '[data-core-side-panel-close]', () => this._close('close'));
    }

    cleanFunctional() {
        super.cleanFunctional();
    }
}

registerCoreComponent('core-side-panel', CoreSidePanel);
