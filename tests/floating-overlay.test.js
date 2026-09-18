import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import {
    FloatingOverlay,
    clampCoords,
} from '../lib/floating/floating-overlay.js';

/**
 * @param {Window} view
 * @param {{ width?: number, height?: number }} size
 */
function stubViewport(view, size) {
    Object.defineProperty(view, 'innerWidth', {
        configurable: true,
        value: size.width ?? 800,
    });
    Object.defineProperty(view, 'innerHeight', {
        configurable: true,
        value: size.height ?? 600,
    });
}

/**
 * @param {Element} element
 * @param {{ top: number, left: number, right: number, bottom: number }} rect
 */
function stubRect(element, rect) {
    element.getBoundingClientRect = () => ({
        x: rect.left,
        y: rect.top,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        toJSON() {
            return this;
        },
    });
}

/**
 * @param {Element} element
 * @param {{ width: number, height: number }} size
 */
function stubSize(element, size) {
    Object.defineProperty(element, 'offsetWidth', {
        configurable: true,
        value: size.width,
    });
    Object.defineProperty(element, 'offsetHeight', {
        configurable: true,
        value: size.height,
    });
}

/**
 * @returns {{
 *   document: Document,
 *   window: Window,
 *   host: HTMLElement,
 *   anchor: HTMLElement,
 *   panel: HTMLElement,
 *   mountPoint: HTMLElement,
 * }}
 */
function createHostEnvironment() {
    const { document, window } = parseHTML('<!DOCTYPE html><html><body></body></html>');
    stubViewport(window, { width: 800, height: 600 });

    const host = document.createElement('div');
    const mountPoint = document.createElement('div');
    const anchor = document.createElement('button');
    const panel = document.createElement('div');
    panel.className = 'core-menu__panel';

    mountPoint.appendChild(panel);
    host.appendChild(anchor);
    host.appendChild(mountPoint);
    document.body.appendChild(host);

    stubSize(panel, { width: 160, height: 120 });
    stubRect(anchor, { top: 100, left: 200, right: 280, bottom: 132 });

    return { document, window, host, anchor, panel, mountPoint };
}

test('FloatingOverlay portals into host.ownerDocument.body', async () => {
    const primary = createHostEnvironment();
    const secondary = createHostEnvironment();

    const overlay = new FloatingOverlay({
        host: secondary.host,
        getPanel: () => secondary.panel,
        getAnchor: () => secondary.anchor,
        getMountPoint: () => secondary.mountPoint,
        align: 'start',
    });

    overlay.open();

    assert.equal(secondary.panel.parentElement, secondary.document.body);
    assert.notEqual(secondary.panel.parentElement, primary.document.body);
    assert.equal(primary.document.body.contains(secondary.panel), false);
});

test('FloatingOverlay uses the host Document defaultView for viewport math', async () => {
    const primary = createHostEnvironment();
    const secondary = createHostEnvironment();

    stubViewport(primary.window, { width: 800, height: 600 });
    stubViewport(secondary.window, { width: 400, height: 500 });
    stubRect(secondary.anchor, { top: 420, left: 40, right: 120, bottom: 452 });

    const overlay = new FloatingOverlay({
        host: secondary.host,
        getPanel: () => secondary.panel,
        getAnchor: () => secondary.anchor,
        getMountPoint: () => secondary.mountPoint,
        align: 'start',
    });

    overlay.open();

    assert.equal(secondary.panel.dataset.placement, 'top');
    assert.equal(parseInt(secondary.panel.style.top, 10), 296);
});

test('clampCoords respects the provided view instead of the global window', () => {
    const primaryView = { innerWidth: 800, innerHeight: 600 };
    const secondaryView = { innerWidth: 200, innerHeight: 500 };

    const primaryCoords = clampCoords({ top: 40, left: 180 }, 160, 120, 8, primaryView);
    const secondaryCoords = clampCoords({ top: 40, left: 180 }, 160, 120, 8, secondaryView);

    assert.equal(primaryCoords.left, 180);
    assert.equal(secondaryCoords.left, 32);
});

test('distinct Documents can keep independent open FloatingOverlays', async () => {
    const primary = createHostEnvironment();
    const secondary = createHostEnvironment();

    const primaryOverlay = new FloatingOverlay({
        host: primary.host,
        getPanel: () => primary.panel,
        getAnchor: () => primary.anchor,
        getMountPoint: () => primary.mountPoint,
    });
    const secondaryOverlay = new FloatingOverlay({
        host: secondary.host,
        getPanel: () => secondary.panel,
        getAnchor: () => secondary.anchor,
        getMountPoint: () => secondary.mountPoint,
    });

    primaryOverlay.open();
    secondaryOverlay.open();

    assert.equal(primaryOverlay.isOpen, true);
    assert.equal(secondaryOverlay.isOpen, true);
    assert.equal(primary.panel.parentElement, primary.document.body);
    assert.equal(secondary.panel.parentElement, secondary.document.body);
});

test('FloatingOverlay attaches scroll and resize listeners to the host Window', async () => {
    const secondary = createHostEnvironment();
    const seen = [];

    const originalAdd = secondary.window.addEventListener.bind(secondary.window);
    secondary.window.addEventListener = (type, listener, options) => {
        seen.push({ type, options });
        return originalAdd(type, listener, options);
    };

    const overlay = new FloatingOverlay({
        host: secondary.host,
        getPanel: () => secondary.panel,
        getAnchor: () => secondary.anchor,
        getMountPoint: () => secondary.mountPoint,
    });

    overlay.open();

    assert.deepEqual(
        seen.map((entry) => entry.type).sort(),
        ['resize', 'scroll'],
    );
    assert.equal(seen.find((entry) => entry.type === 'scroll')?.options, true);
});

test('FloatingOverlay destroy removes listeners from the host Window', async () => {
    const secondary = createHostEnvironment();
    const removed = [];

    const originalRemove = secondary.window.removeEventListener.bind(secondary.window);
    secondary.window.removeEventListener = (type, listener, options) => {
        removed.push({ type, options });
        return originalRemove(type, listener, options);
    };

    const overlay = new FloatingOverlay({
        host: secondary.host,
        getPanel: () => secondary.panel,
        getAnchor: () => secondary.anchor,
        getMountPoint: () => secondary.mountPoint,
    });

    overlay.open();
    overlay.destroy();

    assert.deepEqual(
        removed.map((entry) => entry.type).sort(),
        ['resize', 'scroll'],
    );
    assert.equal(overlay.isOpen, false);
    assert.equal(secondary.panel.parentElement, secondary.mountPoint);
});
