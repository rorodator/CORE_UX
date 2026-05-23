/** @type {Record<string, string>} */
export const FLIP_MAP_ALL = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
};

/** @type {Record<string, string>} */
export const FLIP_MAP_VERTICAL = {
    bottom: 'top',
    top: 'bottom'
};

/**
 * Copy theme context from host onto a portaled element.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} host
 */
export function applyThemeContext(element, host) {
    const themeRoot = host.closest('.core-ux-root');
    if (!themeRoot) {
        return;
    }
    element.classList.add('core-ux-root');
    const theme = themeRoot.getAttribute('data-core-theme');
    if (theme) {
        element.setAttribute('data-core-theme', theme);
    }
}

/**
 * Remove theme context applied for portaling.
 *
 * @param {HTMLElement} element
 */
export function clearThemeContext(element) {
    element.classList.remove('core-ux-root');
    element.removeAttribute('data-core-theme');
}

/**
 * @param {string} placement
 * @param {DOMRect} anchor
 * @param {number} panelWidth
 * @param {number} panelHeight
 * @param {number} gap
 * @param {'start'|'center'} align
 * @param {boolean} matchWidth
 * @returns {{ top: number, left: number }}
 */
export function coordsForPlacement(
    placement,
    anchor,
    panelWidth,
    panelHeight,
    gap,
    align,
    matchWidth
) {
    const width = matchWidth ? anchor.width : panelWidth;
    let left;

    if (matchWidth || align === 'start') {
        left = anchor.left;
    } else {
        left = anchor.left + (anchor.width - width) / 2;
    }

    switch (placement) {
        case 'bottom':
            return {
                top: anchor.bottom + gap,
                left
            };
        case 'left':
            return {
                top: anchor.top + (anchor.height - panelHeight) / 2,
                left: anchor.left - width - gap
            };
        case 'right':
            return {
                top: anchor.top + (anchor.height - panelHeight) / 2,
                left: anchor.right + gap
            };
        case 'top':
        default:
            return {
                top: anchor.top - panelHeight - gap,
                left
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
export function clampCoords(coords, width, height, margin) {
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(margin, window.innerHeight - height - margin);
    return {
        top: Math.min(Math.max(coords.top, margin), maxTop),
        left: Math.min(Math.max(coords.left, margin), maxLeft)
    };
}

/**
 * Portals a panel to document.body with fixed positioning to escape overflow clipping.
 */
export class FloatingOverlay {

    /**
     * @param {object} options
     * @param {HTMLElement} options.host
     * @param {() => HTMLElement|null} options.getPanel
     * @param {() => HTMLElement|null} options.getAnchor
     * @param {() => HTMLElement|null} options.getMountPoint
     * @param {() => boolean} [options.isEnabled]
     * @param {() => string} [options.getPlacement]
     * @param {Record<string, string>} [options.flipMap]
     * @param {number} [options.gap]
     * @param {number} [options.margin]
     * @param {boolean} [options.matchWidth]
     * @param {'start'|'center'} [options.align]
     * @param {(anchorEl: HTMLElement) => DOMRect} [options.getAnchorRect]
     * @param {string} [options.floatingClass]
     */
    constructor(options) {
        this._host = options.host;
        this._getPanel = options.getPanel;
        this._getAnchor = options.getAnchor;
        this._getMountPoint = options.getMountPoint;
        this._isEnabled = options.isEnabled || (() => true);
        this._getPlacement = options.getPlacement || (() => 'bottom');
        this._flipMap = options.flipMap || FLIP_MAP_VERTICAL;
        this._gap = options.gap ?? 4;
        this._margin = options.margin ?? 8;
        this._matchWidth = options.matchWidth === true;
        this._align = options.align || 'start';
        this._getAnchorRect = options.getAnchorRect || null;
        this._floatingClass = options.floatingClass || 'core-floating-overlay';
        /** @type {boolean} */
        this._isOpen = false;
        /** @type {HTMLElement|null} */
        this._panel = null;
        /** @type {HTMLElement|null} */
        this._mountPoint = null;
        this._onReposition = () => this.reposition();
    }

    get isOpen() {
        return this._isOpen;
    }

    /** @returns {HTMLElement|null} */
    getPanel() {
        return this._panel || this._getPanel();
    }

    /**
     * @param {Node|null} target
     * @returns {boolean}
     */
    containsTarget(target) {
        if (!target || !(target instanceof Node)) {
            return false;
        }
        const panel = this.getPanel();
        return this._host.contains(target) || Boolean(panel?.contains(target));
    }

    open() {
        if (!this._isEnabled()) {
            return;
        }

        const panel = this._getPanel();
        const mountPoint = this._getMountPoint();
        if (!panel || !mountPoint) {
            return;
        }

        if (this._isOpen && this._panel === panel) {
            this.reposition();
            return;
        }

        if (this._isOpen) {
            this.close();
        }

        this._panel = panel;
        this._mountPoint = mountPoint;
        applyThemeContext(panel, this._host);
        document.body.appendChild(panel);
        panel.classList.add(this._floatingClass);
        this._isOpen = true;
        this.reposition();

        window.addEventListener('scroll', this._onReposition, true);
        window.addEventListener('resize', this._onReposition);
    }

    close() {
        if (!this._isOpen || !this._panel) {
            return;
        }

        const panel = this._panel;
        panel.classList.remove(this._floatingClass);
        clearThemeContext(panel);
        panel.removeAttribute('data-placement');
        panel.style.top = '';
        panel.style.left = '';
        panel.style.width = '';
        panel.style.visibility = '';

        if (this._mountPoint && panel.parentNode === document.body) {
            this._mountPoint.appendChild(panel);
        }

        this._isOpen = false;
        this._panel = null;

        window.removeEventListener('scroll', this._onReposition, true);
        window.removeEventListener('resize', this._onReposition);
    }

    reposition() {
        const panel = this._panel || this._getPanel();
        const anchorEl = this._getAnchor();
        if (!this._isOpen || !panel || !anchorEl) {
            return;
        }

        const anchor = this._getAnchorRect
            ? this._getAnchorRect(anchorEl)
            : anchorEl.getBoundingClientRect();

        panel.style.visibility = 'hidden';
        panel.style.top = '0px';
        panel.style.left = '0px';

        const panelWidth = this._matchWidth ? anchor.width : panel.offsetWidth;
        const panelHeight = panel.offsetHeight;
        let placement = this._getPlacement();
        let coords = coordsForPlacement(
            placement,
            anchor,
            panelWidth,
            panelHeight,
            this._gap,
            this._align,
            this._matchWidth
        );

        const flip = this._flipMap[placement];
        if (flip) {
            if (placement === 'top' && coords.top < this._margin) {
                placement = flip;
                coords = coordsForPlacement(
                    placement,
                    anchor,
                    panelWidth,
                    panelHeight,
                    this._gap,
                    this._align,
                    this._matchWidth
                );
            } else if (placement === 'bottom' && coords.top + panelHeight > window.innerHeight - this._margin) {
                placement = flip;
                coords = coordsForPlacement(
                    placement,
                    anchor,
                    panelWidth,
                    panelHeight,
                    this._gap,
                    this._align,
                    this._matchWidth
                );
            } else if (placement === 'left' && coords.left < this._margin) {
                placement = flip;
                coords = coordsForPlacement(
                    placement,
                    anchor,
                    panelWidth,
                    panelHeight,
                    this._gap,
                    this._align,
                    this._matchWidth
                );
            } else if (placement === 'right' && coords.left + panelWidth > window.innerWidth - this._margin) {
                placement = flip;
                coords = coordsForPlacement(
                    placement,
                    anchor,
                    panelWidth,
                    panelHeight,
                    this._gap,
                    this._align,
                    this._matchWidth
                );
            }
        }

        coords = clampCoords(coords, panelWidth, panelHeight, this._margin);
        panel.style.top = `${Math.round(coords.top)}px`;
        panel.style.left = `${Math.round(coords.left)}px`;
        if (this._matchWidth) {
            panel.style.width = `${Math.round(anchor.width)}px`;
        }
        panel.dataset.placement = placement;
        panel.style.visibility = '';
    }

    destroy() {
        this.close();
    }
}
