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

/**
 * @param {Element} target
 * @param {string} key
 * @returns {Event}
 */
function pressTracked(target, key) {
    const event = createEvent('keydown', { key });
    target.dispatchEvent(event);
    return event;
}

/**
 * @param {Element} submenu
 * @returns {HTMLElement|null}
 */
function submenuPanel(submenu) {
    return document.getElementById(submenu.panelId);
}

/**
 * @param {Element} submenu
 * @returns {boolean}
 */
function isSubmenuOpen(submenu) {
    const panel = submenuPanel(submenu);
    return submenu.hasAttribute('open')
        && panel?.hasAttribute('hidden') === false
        && panel.parentElement === document.body;
}

/**
 * @param {string} value
 * @returns {HTMLElement|null}
 */
function itemByValue(value) {
    return document.querySelector(`[data-value="${value}"]`);
}

/**
 * @returns {{
 *   root: Element,
 *   share: Element,
 *   more: Element,
 *   deep: Element,
 *   exportMenu: Element,
 *   outside: HTMLElement,
 * }}
 */
function mountNestedMenu() {
    focusedElement = null;
    document.body.innerHTML = `
        <core-menu id="menu-root" label="File">
            <core-menu-item value="new" label="New"></core-menu-item>
            <core-menu-submenu id="sub-share" label="Share">
                <core-menu-item value="mail" label="Mail"></core-menu-item>
                <core-menu-item value="link" label="Link" disabled></core-menu-item>
                <core-menu-submenu id="sub-more" label="More">
                    <core-menu-item value="sms" label="SMS"></core-menu-item>
                    <core-menu-submenu id="sub-deep" label="Deep">
                        <core-menu-item value="mms" label="MMS"></core-menu-item>
                    </core-menu-submenu>
                </core-menu-submenu>
            </core-menu-submenu>
            <core-menu-submenu id="sub-export" label="Export">
                <core-menu-item value="pdf" label="PDF"></core-menu-item>
            </core-menu-submenu>
        </core-menu>
        <core-menu id="menu-other" label="Other">
            <core-menu-item value="other" label="Other item"></core-menu-item>
        </core-menu>
        <button type="button" id="outside">Outside</button>
    `;
    return {
        root: document.getElementById('menu-root'),
        share: document.getElementById('sub-share'),
        more: document.getElementById('sub-more'),
        deep: document.getElementById('sub-deep'),
        exportMenu: document.getElementById('sub-export'),
        outside: document.getElementById('outside'),
    };
}

test('ArrowLeft and ArrowRight on a flat menu item do not preventDefault', async () => {
    await customElements.whenDefined('core-menu');
    const { a } = mountThreeMenus();

    a.openMenu();
    const item = firstItemOf(a);
    const left = pressTracked(item, 'ArrowLeft');
    const right = pressTracked(item, 'ArrowRight');

    assert.equal(left.defaultPrevented, false);
    assert.equal(right.defaultPrevented, false);
    assert.equal(isOpen(a), true);
    assert.equal(document.activeElement, item);
});

test('submenu open attribute and openSubmenu stay closed while the root is closed', async () => {
    await customElements.whenDefined('core-menu');
    focusedElement = null;
    document.body.innerHTML = `
        <core-menu id="menu-root" label="File">
            <core-menu-submenu id="sub-share" label="Share" open>
                <core-menu-item value="mail" label="Mail"></core-menu-item>
                <core-menu-submenu id="sub-deep" label="Deep" open>
                    <core-menu-item value="sms" label="SMS"></core-menu-item>
                </core-menu-submenu>
            </core-menu-submenu>
        </core-menu>
    `;
    const share = document.getElementById('sub-share');
    const deep = document.getElementById('sub-deep');

    assert.equal(share.hasAttribute('open'), false);
    assert.equal(deep.hasAttribute('open'), false);
    assert.equal(share.openSubmenu(), false);
    assert.equal(deep.openSubmenu(), false);
    assert.equal(document.body.querySelector('.core-floating-overlay'), null);

    share.setAttribute('open', '');
    deep.setAttribute('open', '');
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(deep.hasAttribute('open'), false);
});

test('a submenu does not open when the root menu is disabled', async () => {
    await customElements.whenDefined('core-menu');
    focusedElement = null;
    document.body.innerHTML = `
        <core-menu id="menu-root" label="File" disabled>
            <core-menu-submenu id="sub-share" label="Share" open>
                <core-menu-item value="mail" label="Mail"></core-menu-item>
            </core-menu-submenu>
        </core-menu>
    `;
    const share = document.getElementById('sub-share');

    assert.equal(share.hasAttribute('open'), false);
    assert.equal(share.openSubmenu(), false);
    share.setAttribute('open', '');
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(submenuPanel(share)?.parentElement === document.body, false);
});

test('a grandchild submenu does not open while its parent submenu is closed', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, deep } = mountNestedMenu();

    root.openMenu();
    assert.equal(deep.openSubmenu(), false);
    deep.setAttribute('open', '');

    assert.equal(share.hasAttribute('open'), false);
    assert.equal(deep.hasAttribute('open'), false);
    assert.equal(submenuPanel(deep)?.parentElement === document.body, false);
    assert.equal(isOpen(root), true);
});

test('setting open on a submenu does not move focus when ancestors are open', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, outside } = mountNestedMenu();

    root.openMenu();
    outside.focus();
    share.setAttribute('open', '');

    assert.equal(isSubmenuOpen(share), true);
    assert.equal(document.activeElement, outside);
});

test('ArrowRight Enter and Space open a submenu without an extra root open event', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share } = mountNestedMenu();
    let rootOpens = 0;
    root.addEventListener('core-menu-open', () => {
        rootOpens += 1;
    });

    root.openMenu();
    assert.equal(rootOpens, 1);
    press(firstItemOf(root), 'ArrowDown');
    assert.equal(document.activeElement, share.triggerElement);

    const right = pressTracked(share.triggerElement, 'ArrowRight');
    assert.equal(right.defaultPrevented, true);
    assert.equal(isSubmenuOpen(share), true);
    assert.equal(share.triggerElement.getAttribute('aria-expanded'), 'true');
    assert.equal(share.triggerElement.getAttribute('aria-haspopup'), 'menu');
    assert.equal(share.triggerElement.getAttribute('role'), 'menuitem');
    assert.equal(document.activeElement, itemByValue('mail'));
    assert.equal(isOpen(root), true);
    assert.equal(openMenuCount(), 1);
    assert.equal(rootOpens, 1);

    share.closeSubmenu();
    press(share.triggerElement, 'Enter');
    assert.equal(isSubmenuOpen(share), true);
    assert.equal(document.activeElement, itemByValue('mail'));

    share.closeSubmenu();
    const space = pressTracked(share.triggerElement, ' ');
    assert.equal(space.defaultPrevented, true);
    assert.equal(isSubmenuOpen(share), true);
    assert.equal(rootOpens, 1);
});

test('submenu arrow keys stay inside that panel and skip disabled items', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    assert.equal(document.activeElement, itemByValue('mail'));

    press(itemByValue('mail'), 'ArrowDown');
    assert.equal(document.activeElement, more.triggerElement);
    press(more.triggerElement, 'ArrowDown');
    assert.equal(document.activeElement, itemByValue('mail'));
    press(itemByValue('mail'), 'End');
    assert.equal(document.activeElement, more.triggerElement);
    press(more.triggerElement, 'Home');
    assert.equal(document.activeElement, itemByValue('mail'));
    assert.notEqual(document.activeElement, itemByValue('link'));
    assert.notEqual(document.activeElement, itemByValue('new'));
    assert.notEqual(document.activeElement, itemByValue('sms'));
});

test('Left and Escape close one submenu level and Tab closes the chain', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more, deep } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    deep.openSubmenu();
    assert.equal(document.activeElement, itemByValue('mms'));

    const left = pressTracked(itemByValue('mms'), 'ArrowLeft');
    assert.equal(left.defaultPrevented, true);
    assert.equal(deep.hasAttribute('open'), false);
    assert.equal(isSubmenuOpen(more), true);
    assert.equal(isSubmenuOpen(share), true);
    assert.equal(isOpen(root), true);
    assert.equal(document.activeElement, deep.triggerElement);

    const escape = pressTracked(deep.triggerElement, 'Escape');
    assert.equal(escape.defaultPrevented, true);
    assert.equal(more.hasAttribute('open'), false);
    assert.equal(isSubmenuOpen(share), true);
    assert.equal(document.activeElement, more.triggerElement);

    const tab = pressTracked(more.triggerElement, 'Tab');
    assert.equal(tab.defaultPrevented, false);
    assert.equal(isOpen(root), false);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(document.activeElement, triggerOf(root));
});

test('clicking inside a portaled submenu does not close it and outside click closes the chain', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, outside } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    click(submenuPanel(share));
    assert.equal(isOpen(root), true);
    assert.equal(isSubmenuOpen(share), true);

    click(outside);
    assert.equal(isOpen(root), false);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(submenuPanel(share)?.parentElement === document.body, false);
    assert.equal(document.activeElement, triggerOf(root));
});

test('a three-level selection emits one document core-menu-select and no item event', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more, deep } = mountNestedMenu();
    let itemEvents = 0;
    let selectEvents = 0;
    let value = '';
    const onItem = () => {
        itemEvents += 1;
    };
    const onSelect = (event) => {
        selectEvents += 1;
        value = event.detail?.value || '';
    };
    document.addEventListener('core-menu-item-select', onItem);
    document.addEventListener('core-menu-select', onSelect);

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    deep.openSubmenu();
    click(itemByValue('mms'));

    document.removeEventListener('core-menu-item-select', onItem);
    document.removeEventListener('core-menu-select', onSelect);

    assert.equal(itemEvents, 0);
    assert.equal(selectEvents, 1);
    assert.equal(value, 'mms');
    assert.equal(isOpen(root), false);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(more.hasAttribute('open'), false);
    assert.equal(deep.hasAttribute('open'), false);
});

test('opening another root closes the previous submenu chain once', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more, deep } = mountNestedMenu();
    const other = document.getElementById('menu-other');
    let rootCloses = 0;
    root.addEventListener('core-menu-close', () => {
        rootCloses += 1;
    });

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    deep.openSubmenu();
    other.openMenu();

    assert.equal(isOpen(root), false);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(more.hasAttribute('open'), false);
    assert.equal(deep.hasAttribute('open'), false);
    assert.equal(isOpen(other), true);
    assert.equal(openMenuCount(), 1);
    assert.equal(rootCloses, 1);
    assert.notEqual(document.activeElement, triggerOf(root));
    assert.equal(submenuPanel(deep)?.parentElement === document.body, false);
    assert.equal(submenuPanel(share)?.parentElement === document.body, false);
});

test('opening a sibling submenu closes the previous sibling chain only', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more, exportMenu } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    exportMenu.openSubmenu();

    assert.equal(isOpen(root), true);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(more.hasAttribute('open'), false);
    assert.equal(isSubmenuOpen(exportMenu), true);
    assert.equal(document.activeElement, itemByValue('pdf'));
});

test('disabling an open submenu closes its chain and syncs the trigger without rebuilding', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more, deep, exportMenu } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    deep.openSubmenu();
    const mail = itemByValue('mail');
    const panel = submenuPanel(share);

    share.setAttribute('disabled', '');

    assert.equal(share.triggerElement.hasAttribute('disabled'), true);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(more.hasAttribute('open'), false);
    assert.equal(deep.hasAttribute('open'), false);
    assert.equal(panel.parentElement === document.body, false);
    assert.equal(itemByValue('mail'), mail);
    assert.equal(isOpen(root), true);

    itemByValue('new').focus();
    press(itemByValue('new'), 'ArrowDown');
    assert.equal(document.activeElement, exportMenu.triggerElement);
    press(exportMenu.triggerElement, 'ArrowDown');
    assert.equal(document.activeElement, itemByValue('new'));
});

test('changing a submenu label does not rebuild its panel', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    const mail = itemByValue('mail');
    const panel = submenuPanel(share);

    share.setAttribute('label', 'Partager');

    assert.equal(share.triggerElement.querySelector('[data-core-menu-submenu-label]').textContent, 'Partager');
    assert.equal(itemByValue('mail'), mail);
    assert.equal(mail.parentElement?.parentElement, panel);
    assert.equal(panel.parentElement, document.body);
    assert.equal(isSubmenuOpen(share), true);
    assert.equal(isSubmenuOpen(more), true);
});

test('disabling the root closes open submenus and leaves the root open attribute', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    root.setAttribute('disabled', '');

    assert.equal(root.hasAttribute('open'), true);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(more.hasAttribute('open'), false);
    assert.equal(submenuPanel(share)?.parentElement === document.body, false);
    assert.equal(submenuPanel(more)?.parentElement === document.body, false);
});

test('submenu near the right edge flips left and otherwise aligns its top to the item', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share } = mountNestedMenu();
    viewportWidth = 800;
    viewportHeight = 600;

    root.openMenu();
    stubRect(share.triggerElement, { top: 80, left: 40, right: 180, bottom: 112 });
    stubSize(submenuPanel(share), { width: 160, height: 120 });
    share.openSubmenu();

    const openedRight = submenuPanel(share);
    assert.equal(openedRight.dataset.placement, 'right');
    assert.equal(parseInt(openedRight.style.top, 10), 80);

    share.closeSubmenu();
    stubRect(share.triggerElement, { top: 80, left: 700, right: 760, bottom: 112 });
    stubSize(submenuPanel(share), { width: 160, height: 120 });
    share.openSubmenu();

    const flipped = submenuPanel(share);
    assert.equal(flipped.dataset.placement, 'left');
    assert.equal(parseInt(flipped.style.top, 10), 80);
});

test('changing root align closes submenus and keeps the root exclusive', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more } = mountNestedMenu();
    const other = document.getElementById('menu-other');

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    root.setAttribute('align', 'start');

    assert.equal(isOpen(root), true);
    assert.equal(share.hasAttribute('open'), false);
    assert.equal(more.hasAttribute('open'), false);
    assert.equal(submenuPanel(share)?.parentElement === document.body, false);

    other.openMenu();
    assert.equal(isOpen(root), false);
    assert.equal(isOpen(other), true);
});

test('disconnect removes portaled submenu panels', async () => {
    await customElements.whenDefined('core-menu');
    const { root, share, more, deep } = mountNestedMenu();

    root.openMenu();
    share.openSubmenu();
    more.openSubmenu();
    deep.openSubmenu();
    const panels = [submenuPanel(share), submenuPanel(more), submenuPanel(deep)];
    panels.forEach((panel) => {
        assert.equal(panel.parentElement, document.body);
    });

    root.remove();
    panels.forEach((panel) => {
        assert.equal(document.body.contains(panel), false);
    });
    assert.doesNotThrow(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('scroll'));
    });
});
