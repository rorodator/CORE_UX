import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountHtml, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/** @type {string[]} */
const POSITIONS = ['top', 'bottom', 'left', 'right'];

/** @type {Record<string, string>} */
const FLIP_MAP = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
};

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
        this._onTriggerEnter = this._scheduleShow.bind(this);
        this._onTriggerLeave = this._scheduleHide.bind(this);
        this._onTriggerFocusIn = this._scheduleShow.bind(this);
        this._onTriggerFocusOut = this._handleFocusOut.bind(this);
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onReposition = this._repositionIfOpen.bind(this);
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
        mountHtml(trigger, this._slotContent);

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
        const triggerWrap = this.querySelector('.core-tooltip__trigger');
        const popup = this.querySelector('.core-tooltip__popup');
        if (!root || !triggerWrap || !popup || this.isDisabled) {
            return;
        }

        this._applyThemeContext(popup);
        document.body.appendChild(popup);
        popup.classList.add('core-tooltip__popup--floating');
        popup.removeAttribute('hidden');
        root.classList.add('core-tooltip--open');
        this._isOpen = true;
        this._positionFloating(popup, triggerWrap);

        window.addEventListener('scroll', this._onReposition, true);
        window.addEventListener('resize', this._onReposition);
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
        popup.classList.remove('core-tooltip__popup--floating', 'core-ux-root');
        popup.removeAttribute('data-placement');
        popup.removeAttribute('data-core-theme');
        popup.style.top = '';
        popup.style.left = '';
        popup.style.visibility = '';
        root.appendChild(popup);
        root.classList.remove('core-tooltip--open');
        this._isOpen = false;

        window.removeEventListener('scroll', this._onReposition, true);
        window.removeEventListener('resize', this._onReposition);
        document.removeEventListener('keydown', this._onKeyDown);

        if (wasOpen) {
            this.dispatchEvent(new CustomEvent('core-tooltip-hide', { bubbles: true }));
        }
    }

    _repositionIfOpen() {
        if (!this._isOpen) {
            return;
        }
        const triggerWrap = this.querySelector('.core-tooltip__trigger');
        const popup = document.getElementById(this._tooltipId);
        if (triggerWrap && popup) {
            this._positionFloating(popup, triggerWrap);
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
     * @param {HTMLElement} popup
     */
    _applyThemeContext(popup) {
        const themeRoot = this.closest('.core-ux-root');
        if (themeRoot) {
            popup.classList.add('core-ux-root');
            const theme = themeRoot.getAttribute('data-core-theme');
            if (theme) {
                popup.setAttribute('data-core-theme', theme);
            }
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

    /**
     * @param {HTMLElement} popup
     * @param {HTMLElement} triggerWrap
     */
    _positionFloating(popup, triggerWrap) {
        const gap = 8;
        const margin = 8;
        const anchor = this._getAnchorRect(triggerWrap);

        popup.style.visibility = 'hidden';
        popup.style.top = '0px';
        popup.style.left = '0px';

        const width = popup.offsetWidth;
        const height = popup.offsetHeight;
        let placement = this.position;
        let coords = this._coordsForPlacement(placement, anchor, width, height, gap);

        if (placement === 'top' && coords.top < margin) {
            placement = FLIP_MAP.top;
            coords = this._coordsForPlacement(placement, anchor, width, height, gap);
        } else if (placement === 'bottom' && coords.top + height > window.innerHeight - margin) {
            placement = FLIP_MAP.bottom;
            coords = this._coordsForPlacement(placement, anchor, width, height, gap);
        } else if (placement === 'left' && coords.left < margin) {
            placement = FLIP_MAP.left;
            coords = this._coordsForPlacement(placement, anchor, width, height, gap);
        } else if (placement === 'right' && coords.left + width > window.innerWidth - margin) {
            placement = FLIP_MAP.right;
            coords = this._coordsForPlacement(placement, anchor, width, height, gap);
        }

        coords = this._clampCoords(coords, width, height, margin);
        popup.style.top = `${Math.round(coords.top)}px`;
        popup.style.left = `${Math.round(coords.left)}px`;
        popup.dataset.placement = placement;
        popup.style.visibility = '';
    }

    /**
     * @param {string} placement
     * @param {DOMRect} anchor
     * @param {number} width
     * @param {number} height
     * @param {number} gap
     * @returns {{ top: number, left: number }}
     */
    _coordsForPlacement(placement, anchor, width, height, gap) {
        switch (placement) {
            case 'bottom':
                return {
                    top: anchor.bottom + gap,
                    left: anchor.left + (anchor.width - width) / 2
                };
            case 'left':
                return {
                    top: anchor.top + (anchor.height - height) / 2,
                    left: anchor.left - width - gap
                };
            case 'right':
                return {
                    top: anchor.top + (anchor.height - height) / 2,
                    left: anchor.right + gap
                };
            case 'top':
            default:
                return {
                    top: anchor.top - height - gap,
                    left: anchor.left + (anchor.width - width) / 2
                };
        }
    }

    /**
     * @param {{ top: number, left: number }} coords
     * @param {number} width
     * @param {number} height
     * @param {number} margin
     * @returns {{ top: number, left: number }}
     */
    _clampCoords(coords, width, height, margin) {
        const maxLeft = Math.max(margin, window.innerWidth - width - margin);
        const maxTop = Math.max(margin, window.innerHeight - height - margin);
        return {
            top: Math.min(Math.max(coords.top, margin), maxTop),
            left: Math.min(Math.max(coords.left, margin), maxLeft)
        };
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
