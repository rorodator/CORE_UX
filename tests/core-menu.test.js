import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-menu/core-menu.js';

/** @type {number} */
let viewportWidth = 800;
/** @type {number} */
let viewportHeight = 600;

Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    get: () => viewportWidth,
});
Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    get: () => viewportHeight,
});

let focusedElement = null;
Object.defineProperty(document, 'activeElement', {
    configurable: true,
    get: () => focusedElement,
});
HTMLElement.prototype.focus = function focus() {
    focusedElement = this;
};
HTMLElement.prototype.blur = function blur() {
    if (focusedElement === this) {
        focusedElement = null;
    }
};

/**
 * @param {string} type
 * @param {{ key?: string }} [properties]
 * @returns {Event}
 */
function createEvent(type, properties = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.entries(properties).forEach(([name, value]) => {
        Object.defineProperty(event, name, { value });
    });
    return event;
}

/**
 * @param {Element} target
 */
function click(target) {
    target.dispatchEvent(createEvent('click'));
}

/**
 * @param {Element} target
 * @param {string} key
 */
function press(target, key) {
    target.dispatchEvent(createEvent('keydown', { key }));
}

/**
 * @param {Element} menu
 * @returns {HTMLElement}
 */
function triggerOf(menu) {
    return menu.querySelector('[data-core-menu-trigger]');
}

/**
 * @param {Element} menu
 * @returns {HTMLElement}
 */
function firstItemOf(menu) {
    return panelOf(menu)?.querySelector('[role="menuitem"]')
        || menu.querySelector('[role="menuitem"]');
}

/**
 * @param {Element} menu
 * @returns {HTMLElement|null}
 */
function panelOf(menu) {
    const id = menu.getAttribute('id');
    if (id) {
        const byId = document.getElementById(`${id}-panel`);
        if (byId) {
            return byId;
        }
    }
    return menu.querySelector('.core-menu__panel');
}

/**
 * @param {Element} menu
 * @returns {boolean}
 */
function isOpen(menu) {
    const panel = panelOf(menu);
    return menu.hasAttribute('open')
        && panel?.hasAttribute('hidden') === false;
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
 * @param {{ align?: string, id?: string, label?: string }} [options]
 * @returns {{ menu: Element, trigger: HTMLElement, panel: HTMLElement|null }}
 */
function mountPositionedMenu(options = {}) {
    if (options.viewportWidth !== undefined) {
        viewportWidth = options.viewportWidth;
    } else {
        viewportWidth = 800;
    }
    if (options.viewportHeight !== undefined) {
        viewportHeight = options.viewportHeight;
    } else {
        viewportHeight = 600;
    }
    focusedElement = null;
    const id = options.id || 'position-menu';
    const align = options.align || 'end';
    const label = options.label || 'Account';
    document.body.innerHTML = `
        <core-menu id="${id}" label="${label}" align="${align}">
            <core-menu-item value="profile" label="Profile"></core-menu-item>
            <core-menu-item value="settings" label="Settings"></core-menu-item>
        </core-menu>
        <button type="button" id="outside">Outside</button>
    `;
    const menu = document.getElementById(id);
    const trigger = triggerOf(menu);
    const panel = panelOf(menu);
    if (panel) {
        stubSize(panel, { width: 160, height: 120 });
    }
    return { menu, trigger, panel };
}

/**
 * @returns {{ a: Element, b: Element, c: Element, outside: HTMLElement }}
 */
function mountThreeMenus() {
    focusedElement = null;
    document.body.innerHTML = `
        <core-menu id="menu-a" label="Menu A">
            <core-menu-item value="a1" label="Alpha one"></core-menu-item>
            <core-menu-item value="a2" label="Alpha two"></core-menu-item>
        </core-menu>
        <core-menu id="menu-b" label="Menu B">
            <core-menu-item value="b1" label="Bravo one"></core-menu-item>
            <core-menu-item value="b2" label="Bravo two"></core-menu-item>
        </core-menu>
        <core-menu id="menu-c" label="Menu C">
            <core-menu-item value="c1" label="Charlie one"></core-menu-item>
        </core-menu>
        <button type="button" id="outside">Outside</button>
    `;
    return {
        a: document.getElementById('menu-a'),
        b: document.getElementById('menu-b'),
        c: document.getElementById('menu-c'),
        outside: document.getElementById('outside'),
    };
}

/**
 * @param {Element} menu
 * @returns {number}
 */
function openMenuCount() {
    return Array.from(document.querySelectorAll('core-menu')).filter((menu) => isOpen(menu)).length;
}

test('clicking successive triggers keeps a single open core-menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b, c } = mountThreeMenus();

    click(triggerOf(a));
    assert.equal(isOpen(a), true);
    assert.equal(isOpen(b), false);
    assert.equal(isOpen(c), false);

    click(triggerOf(b));
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(isOpen(c), false);

    click(triggerOf(c));
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), false);
    assert.equal(isOpen(c), true);
    assert.equal(openMenuCount(), 1);
});

test('opening B from its trigger does not restore focus to A', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    click(triggerOf(a));
    assert.equal(isOpen(a), true);

    triggerOf(b).focus();
    click(triggerOf(b));

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.notEqual(document.activeElement, triggerOf(a));
    assert.equal(document.activeElement, firstItemOf(b));
});

test('keyboard open of B closes A and focuses B items', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    assert.equal(isOpen(a), true);

    triggerOf(b).focus();
    press(triggerOf(b), 'Enter');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.notEqual(document.activeElement, triggerOf(a));
    assert.equal(document.activeElement, firstItemOf(b));
});

test('ArrowDown on trigger B closes A and focuses the first item of B', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    triggerOf(b).focus();
    press(triggerOf(b), 'ArrowDown');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(document.activeElement, firstItemOf(b));
});

test('programmatic openMenu keeps a single open menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    b.openMenu();

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(openMenuCount(), 1);
});

test('programmatic open attribute keeps a single open menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.setAttribute('open', '');
    b.setAttribute('open', '');

    assert.equal(a.hasAttribute('open'), false);
    assert.equal(b.hasAttribute('open'), true);
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(openMenuCount(), 1);
});

test('attribute-open of B moves focus off A when A owned focus', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    assert.equal(document.activeElement, firstItemOf(a));

    b.setAttribute('open', '');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.notEqual(document.activeElement, firstItemOf(a));
    assert.notEqual(document.activeElement, triggerOf(a));
    assert.equal(document.activeElement, triggerOf(b));
});

test('attribute-open of B does not steal focus when A did not own it', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b, outside } = mountThreeMenus();

    a.setAttribute('open', '');
    outside.focus();
    b.setAttribute('open', '');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(document.activeElement, outside);
});

test('outside click closes the open menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, outside } = mountThreeMenus();

    a.openMenu();
    click(outside);

    assert.equal(isOpen(a), false);
    assert.equal(a.hasAttribute('open'), false);
});

test('Escape closes the open menu and restores trigger focus', async () => {
    await customElements.whenDefined('core-menu');
    const { a } = mountThreeMenus();

    a.openMenu();
    assert.equal(document.activeElement, firstItemOf(a));

    press(firstItemOf(a), 'Escape');

    assert.equal(isOpen(a), false);
    assert.equal(document.activeElement, triggerOf(a));
});

test('peer auto-close emits one close on A and one open on B', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    let aClose = 0;
    let aOpen = 0;
    let bClose = 0;
    let bOpen = 0;
    a.addEventListener('core-menu-close', () => {
        aClose += 1;
    });
    a.addEventListener('core-menu-open', () => {
        aOpen += 1;
    });
    b.addEventListener('core-menu-close', () => {
        bClose += 1;
    });
    b.addEventListener('core-menu-open', () => {
        bOpen += 1;
    });

    a.openMenu();
    b.openMenu();

    assert.equal(aOpen, 1);
    assert.equal(aClose, 1);
    assert.equal(bOpen, 1);
    assert.equal(bClose, 0);
});

test('render while open does not drop exclusive registration', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    a.setAttribute('align', 'start');
    assert.equal(isOpen(a), true);

    b.openMenu();
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
});

test('same-menu trigger toggle still closes and restores focus', async () => {
    await customElements.whenDefined('core-menu');
    const { a } = mountThreeMenus();

    click(triggerOf(a));
    assert.equal(isOpen(a), true);

    click(triggerOf(a));
    assert.equal(isOpen(a), false);
    assert.equal(document.activeElement, triggerOf(a));
});

test('open menu prefers bottom placement when viewport space allows', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu({ align: 'end' });
    stubRect(trigger, { top: 100, left: 200, right: 280, bottom: 132 });

    menu.openMenu();
    const panel = panelOf(menu);
    assert.ok(panel);
    assert.equal(panel.parentElement, document.body);
    assert.equal(panel.dataset.placement, 'bottom');
    assert.equal(parseInt(panel.style.top, 10), 136);
});

test('menu near viewport bottom flips panel above the trigger', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu({ align: 'end' });
    stubRect(trigger, { top: 548, left: 24, right: 104, bottom: 580 });

    menu.openMenu();
    const panel = panelOf(menu);
    assert.ok(panel);
    assert.equal(panel.dataset.placement, 'top');
    assert.equal(parseInt(panel.style.top, 10), 424);
});

test('menu panel stays horizontally inside the viewport', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu({ align: 'start', viewportWidth: 200 });
    stubRect(trigger, { top: 40, left: 180, right: 220, bottom: 72 });

    menu.openMenu();
    const panel = panelOf(menu);
    assert.ok(panel);
    assert.equal(parseInt(panel.style.left, 10), 32);
});

test('align start keeps the panel left edge on the trigger', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu({ align: 'start' });
    stubRect(trigger, { top: 80, left: 120, right: 200, bottom: 112 });

    menu.openMenu();
    const panel = panelOf(menu);
    assert.ok(panel);
    assert.equal(parseInt(panel.style.left, 10), 120);
});

test('align end keeps the panel right edge on the trigger', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu({ align: 'end' });
    stubRect(trigger, { top: 80, left: 200, right: 280, bottom: 112 });

    menu.openMenu();
    const panel = panelOf(menu);
    assert.ok(panel);
    assert.equal(parseInt(panel.style.left, 10), 120);
});

test('closing restores panel ownership to the menu mount point', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu();
    stubRect(trigger, { top: 100, left: 200, right: 280, bottom: 132 });

    menu.openMenu();
    const panel = panelOf(menu);
    assert.equal(panel?.parentElement, document.body);

    menu.closeMenu();
    assert.equal(panel?.parentElement, menu.querySelector(':scope > .core-menu'));
    assert.equal(panel?.classList.contains('core-floating-overlay'), false);
});

test('outside click closes when the panel is portaled', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu();
    stubRect(trigger, { top: 548, left: 24, right: 104, bottom: 580 });
    const outside = document.getElementById('outside');

    menu.openMenu();
    assert.equal(panelOf(menu)?.parentElement, document.body);

    click(outside);
    assert.equal(isOpen(menu), false);
});

test('selecting an item works when the panel is portaled', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu();
    stubRect(trigger, { top: 548, left: 24, right: 104, bottom: 580 });

    let selected = '';
    menu.addEventListener('core-menu-select', (event) => {
        selected = event.detail?.value || '';
    });

    menu.openMenu();
    const item = panelOf(menu)?.querySelector('[data-core-menu-item]');
    assert.ok(item);
    click(item);

    assert.equal(selected, 'profile');
    assert.equal(isOpen(menu), false);
});

test('Escape closes a portaled menu and restores trigger focus', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu();
    stubRect(trigger, { top: 548, left: 24, right: 104, bottom: 580 });

    menu.openMenu();
    const item = firstItemOf(menu);
    assert.equal(document.activeElement, item);

    press(item, 'Escape');

    assert.equal(isOpen(menu), false);
    assert.equal(document.activeElement, trigger);
});

test('one-open-menu-per-document invariant holds with portaled panels', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();
    stubRect(triggerOf(a), { top: 100, left: 40, right: 120, bottom: 132 });
    stubRect(triggerOf(b), { top: 200, left: 40, right: 120, bottom: 232 });
    stubSize(panelOf(a), { width: 160, height: 120 });
    stubSize(panelOf(b), { width: 160, height: 120 });

    a.openMenu();
    b.openMenu();

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(openMenuCount(), 1);
    assert.equal(panelOf(b)?.parentElement, document.body);
    assert.equal(panelOf(a)?.parentElement, a.querySelector(':scope > .core-menu'));
});

test('disconnect cleans up overlay listeners and repatriates the panel', async () => {
    await customElements.whenDefined('core-menu');
    const { menu, trigger } = mountPositionedMenu();
    stubRect(trigger, { top: 548, left: 24, right: 104, bottom: 580 });

    menu.openMenu();
    const panel = panelOf(menu);
    assert.equal(panel?.parentElement, document.body);

    menu.remove();
    assert.equal(document.body.contains(panel), false);

    assert.doesNotThrow(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('scroll'));
    });
});
