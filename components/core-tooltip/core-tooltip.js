import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountTrustedHtml, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import { FLIP_MAP_ALL, FloatingOverlay } from '../../lib/floating/floating-overlay.js';

/** @type {string[]} */
const POSITIONS = ['top', 'bottom', 'left', 'right'];

let tooltipUid = 0;

/**
 * Accessible tooltip wrapper — positions top | bottom | left | right around slotted trigger.
 * Popup is portaled to document.body while open to escape overflow clipping.
 */
export class CoreTooltip extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['text', 'position', 'delay', 'hide-delay', 'disabled'];
    }

    constructor() {
        super();
        /** @type {number|null} */
        this._showTimer = null;
        /** @type {number|null} */
        this._hideTimer = null;
        this._tooltipId = `core-tooltip-${++tooltipUid}`;
        this._isOpen = false;
        /** @type {FloatingOverlay|null} */
        this._floating = null;
        this._onTriggerEnter = this._scheduleShow.bind(this);
        this._onTriggerLeave = this._scheduleHide.bind(this);
        this._onTriggerFocusIn = this._scheduleShow.bind(this);
        this._onTriggerFocusOut = this._handleFocusOut.bind(this);
        this._onKeyDown = this._handleKeyDown.bind(this);
    }

    attributeChangedCallback() {
        this.slotAttributeChanged();
    }

    get text() {
        return this.getAttribute('text') || '';
    }

    get position() {
        const value = this.getAttribute('position');
        return POSITIONS.includes(value) ? value : 'top';
    }

    get showDelay() {
        const value = parseInt(this.getAttribute('delay'), 10);
        return Number.isFinite(value) && value >= 0 ? value : 200;
    }

    get hideDelay() {
        const value = parseInt(this.getAttribute('hide-delay'), 10);
        return Number.isFinite(value) && value >= 0 ? value : 100;
    }

    get isDisabled() {
        return hasBoolAttr(this, 'disabled') || !this.text.trim();
    }

    ui_render() {
        const root = createElement('div', {
            className: `core-tooltip core-tooltip--${this.position}`
        });
        const trigger = createElement('div', { className: 'core-tooltip__trigger' });
        mountTrustedHtml(trigger, this._slotContent);

        const popup = createElement('div', {
            className: 'core-tooltip__popup',
            text: this.text,
            attrs: {
                id: this._tooltipId,
                role: 'tooltip',
                hidden: true
            }
        });

        root.appendChild(trigger);
        root.appendChild(popup);
        this.replaceChildren(root);
    }

    ui_toFunctional() {
        const trigger = this.querySelector('.core-tooltip__trigger');
        if (!trigger) {
            return;
        }

        this._floating = new FloatingOverlay({
            host: this,
            getPanel: () => this.querySelector('.core-tooltip__popup'),
            getAnchor: () => this.querySelector('.core-tooltip__trigger'),
            getMountPoint: () => this.querySelector('.core-tooltip'),
            getPlacement: () => this.position,
            flipMap: FLIP_MAP_ALL,
            gap: 8,
            margin: 8,
            align: 'center',
            getAnchorRect: (anchorWrap) => this._getAnchorRect(anchorWrap)
        });

        this._ensureTriggerFocusable(trigger);
        this._syncAriaDescribedBy(trigger);

        trigger.addEventListener('mouseenter', this._onTriggerEnter);
        trigger.addEventListener('mouseleave', this._onTriggerLeave);
        trigger.addEventListener('focusin', this._onTriggerFocusIn);
        trigger.addEventListener('focusout', this._onTriggerFocusOut);
    }

    /**
     * @param {HTMLElement} trigger
     */
    _ensureTriggerFocusable(trigger) {
        const focusable = trigger.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable) {
            trigger.setAttribute('tabindex', '0');
        } else {
            trigger.removeAttribute('tabindex');
        }
    }

    /**
     * @param {HTMLElement} trigger
     */
    _syncAriaDescribedBy(trigger) {
        const focusTarget = trigger.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || trigger;

        if (this.isDisabled) {
            focusTarget.removeAttribute('aria-describedby');
        } else {
            focusTarget.setAttribute('aria-describedby', this._tooltipId);
        }
    }

    _scheduleShow() {
        if (this.isDisabled) {
            return;
        }
        this._clearHideTimer();
        this._clearShowTimer();
        this._showTimer = window.setTimeout(() => this._show(), this.showDelay);
    }

    _scheduleHide() {
        this._clearShowTimer();
        this._clearHideTimer();
        this._hideTimer = window.setTimeout(() => this._hide(), this.hideDelay);
    }

    /**
     * @param {FocusEvent} event
     */
    _handleFocusOut(event) {
        const trigger = this.querySelector('.core-tooltip__trigger');
        if (trigger?.contains(/** @type {Node|null} */ (event.relatedTarget))) {
            return;
        }
        this._scheduleHide();
    }

    _show() {
        const root = this.querySelector('.core-tooltip');
        const popup = this.querySelector('.core-tooltip__popup');
        if (!root || !popup || this.isDisabled) {
            return;
        }

        popup.removeAttribute('hidden');
        root.classList.add('core-tooltip--open');
        this._floating?.open();
        this._isOpen = true;

        document.addEventListener('keydown', this._onKeyDown);
        this.dispatchEvent(new CustomEvent('core-tooltip-show', { bubbles: true }));
    }

    _hide() {
        const root = this.querySelector('.core-tooltip');
        const popup = document.getElementById(this._tooltipId);
        if (!root || !popup) {
            return;
        }

        const wasOpen = this._isOpen;
        popup.setAttribute('hidden', '');
        this._floating?.close();
        root.classList.remove('core-tooltip--open');
        this._isOpen = false;

        document.removeEventListener('keydown', this._onKeyDown);

        if (wasOpen) {
            this.dispatchEvent(new CustomEvent('core-tooltip-hide', { bubbles: true }));
        }
    }

    /**
     * @param {KeyboardEvent} event
     */
    _handleKeyDown(event) {
        if (event.key === 'Escape') {
            this._clearShowTimer();
            this._hide();
        }
    }

    /**
     * @param {HTMLElement} triggerWrap
     * @returns {DOMRect}
     */
    _getAnchorRect(triggerWrap) {
        const focusable = triggerWrap.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return (focusable || triggerWrap).getBoundingClientRect();
    }

    _clearShowTimer() {
        if (this._showTimer != null) {
            clearTimeout(this._showTimer);
            this._showTimer = null;
        }
    }

    _clearHideTimer() {
        if (this._hideTimer != null) {
            clearTimeout(this._hideTimer);
            this._hideTimer = null;
        }
    }

    cleanFunctional() {
        this._clearShowTimer();
        this._clearHideTimer();
        this._hide();
        this._floating?.destroy();
        this._floating = null;

        const trigger = this.querySelector('.core-tooltip__trigger');
        if (trigger) {
            trigger.removeEventListener('mouseenter', this._onTriggerEnter);
            trigger.removeEventListener('mouseleave', this._onTriggerLeave);
            trigger.removeEventListener('focusin', this._onTriggerFocusIn);
            trigger.removeEventListener('focusout', this._onTriggerFocusOut);
        }
    }
}

registerCoreComponent('core-tooltip', CoreTooltip);
