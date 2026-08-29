import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
    escapeHtml,
    getPlainTextFromHtml,
    getRichTextPlainLength,
    normalizeRichTextHtml,
    sanitizeRichTextHtml,
    sanitizeRichTextHref,
    sanitizeRichTextPaste,
    sanitizeRichTextStyle,
} from '../lib/html/rich-text-html.js';
import {
    RICH_TEXT_DEFAULT_LABELS,
    RICH_TEXT_LABEL_KEYS,
    RICH_TEXT_LANG_CONTAINER,
    resolveRichTextLabel,
} from '../lib/rich-text/rich-text-i18n.js';
import { resolveRichTextToolbarItems } from '../lib/rich-text/rich-text-toolbar.js';

const langDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../lang');

/** @param {string} html */
function mountRichText(html) {
    document.body.innerHTML = html;
    return /** @type {import('../components/core-rich-text/core-rich-text.js').CoreRichText} */ (
        document.body.firstElementChild
    );
}

test('escapeHtml escapes markup characters', () => {
    assert.equal(escapeHtml('a & b <c> "d"'), 'a &amp; b &lt;c&gt; &quot;d&quot;');
});

test('1. plain text is preserved through sanitize and getPlainTextFromHtml', () => {
    const input = '<p>Hello world</p>';
    const output = sanitizeRichTextHtml(input);
    assert.equal(getPlainTextFromHtml(output), 'Hello world');
});

test('2. bold, italic, and list markup is kept', () => {
    const input = '<p><strong>B</strong> <em>I</em></p><ul><li>One</li></ul>';
    const output = sanitizeRichTextHtml(input);
    assert.match(output, /<strong>B<\/strong>/);
    assert.match(output, /<em>I<\/em>/);
    assert.match(output, /<ul><li>One<\/li><\/ul>/);
});

test('3. valid HTTPS links are kept with rel/target', () => {
    const input = '<a href="https://example.com/path">Link</a>';
    const output = sanitizeRichTextHtml(input);
    assert.match(output, /href="https:\/\/example.com\/path"/);
    assert.match(output, /rel="noopener noreferrer"/);
    assert.match(output, /target="_blank"/);
    assert.equal(sanitizeRichTextHref('https://example.com'), 'https://example.com');
});

test('4. javascript: href is rejected', () => {
    assert.equal(sanitizeRichTextHref('javascript:alert(1)'), null);
    const output = sanitizeRichTextHtml('<a href="javascript:alert(1)">X</a>');
    assert.equal(output.includes('javascript:'), false);
    assert.equal(output.includes('href='), false);
});

test('5. event handler attributes are stripped', () => {
    const output = sanitizeRichTextHtml('<p onclick="alert(1)" onmouseover="evil()">Text</p>');
    assert.equal(output.includes('onclick'), false);
    assert.equal(output.includes('onmouseover'), false);
    assert.match(output, /Text/);
});

test('6. non-whitelisted CSS is removed', () => {
    assert.equal(sanitizeRichTextStyle('background: red; color: blue'), 'color: blue');
    assert.equal(sanitizeRichTextStyle('position: absolute'), null);
    const output = sanitizeRichTextHtml('<p style="background:red;color:#112233">Colored</p>');
    assert.equal(output.includes('background'), false);
    assert.match(output, /color:\s*#112233/);
});

test('7. allowed color is preserved', () => {
    const output = sanitizeRichTextHtml('<span style="color: rgb(10, 20, 30)">Tint</span>');
    assert.match(output, /color: rgb\(10, 20, 30\)/);
});

test('8. allowed text-align is preserved', () => {
    const output = sanitizeRichTextHtml('<p style="text-align: center">Centered</p>');
    assert.match(output, /text-align: center/);
});

test('9. unsupported elements are unwrapped or removed', () => {
    const cases = [
        ['<script>alert(1)</script><p>Safe</p>', 'script'],
        ['<iframe src="x"></iframe><p>Safe</p>', 'iframe'],
        ['<object data="x"></object><p>Safe</p>', 'object'],
        ['<embed src="x"><p>Safe</p>', 'embed'],
        ['<img src="x" alt="y"><p>Safe</p>', 'img'],
    ];
    cases.forEach(([input, forbidden]) => {
        const output = sanitizeRichTextHtml(input);
        assert.equal(output.includes(forbidden), false);
        assert.match(output, /Safe/);
    });
    assert.equal(sanitizeRichTextHref('data:text/html,evil'), null);
});

test('10. hostile paste HTML is sanitized', () => {
    const hostile = '<p>OK</p><script>alert(1)</script><img onerror="x" src="y">';
    const safe = sanitizeRichTextPaste(hostile, '');
    assert.match(safe, /OK/);
    assert.equal(safe.includes('script'), false);
    assert.equal(safe.includes('img'), false);
});

test('11. maxlength uses plain text length', () => {
    const html = '<p><strong>Hello</strong></p>';
    assert.equal(getRichTextPlainLength(html), 5);
    assert.equal(getPlainTextFromHtml(html), 'Hello');
});

test('12. HTML markup does not count toward maxlength', () => {
    const html = '<p><strong>Hi</strong></p>';
    assert.equal(html.length > 10, true);
    assert.equal(getRichTextPlainLength(html), 2);
});

test('13. maxlength exceeded is signaled on the editor', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text maxlength="5"></core-rich-text>');
    host.setHtml('<p>123456</p>');
    const editor = host.querySelector('.core-rich-text__editor');
    assert.ok(editor);
    assert.equal(host.isMaxLengthExceeded(), true);
    assert.equal(editor.hasAttribute('data-maxlength-exceeded'), true);
    assert.equal(editor.getAttribute('aria-invalid'), 'true');
});

test('14. setHtml sanitizes hostile input', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    host.setHtml('<p>Safe</p><script>alert(1)</script>');
    assert.match(host.getHtml(), /Safe/);
    assert.equal(host.getHtml().includes('script'), false);
});

test('15. value and hidden input stay synchronized', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text name="body"></core-rich-text>');
    host.setHtml('<p>Synced</p>');
    const hidden = host.querySelector('input[type="hidden"]');
    assert.ok(hidden);
    assert.equal(hidden.name, 'body');
    assert.equal(hidden.value, host.getHtml());
    assert.equal(host.getAttribute('value'), host.getHtml());
});

test('16. core-rich-text-input returns coherent html and text', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    /** @type {{ html?: string, text?: string }|null} */
    let detail = null;
    host.addEventListener('core-rich-text-input', (event) => {
        detail = /** @type {CustomEvent} */ (event).detail;
    });

    const editor = host.querySelector('.core-rich-text__editor');
    editor.innerHTML = '<p>Typed <strong>text</strong></p>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    assert.ok(detail);
    assert.match(detail.html, /<strong>text<\/strong>/);
    assert.equal(detail.text, 'Typed text');
});

test('17. toolbar preset full exposes alignment controls', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text toolbar="full"></core-rich-text>');
    assert.ok(host.querySelector('[data-rich-text-tool="align-left"]'));
    assert.ok(host.querySelector('[data-rich-text-tool="text-color"]'));
    assert.equal(resolveRichTextToolbarItems('full').some((item) => item.id === 'align-left'), true);
});

test('18. toolbar preset narrative hides alignment controls', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text toolbar="narrative"></core-rich-text>');
    assert.equal(host.querySelector('[data-rich-text-tool="align-left"]'), null);
    assert.ok(host.querySelector('[data-rich-text-tool="bold"]'));
    assert.ok(host.querySelector('[data-rich-text-tool="link"]'));
    assert.equal(resolveRichTextToolbarItems('narrative').some((item) => item.id === 'align-left'), false);
});

test('19. toolbar and link labels are localizable via core_ux container', () => {
    const frLabels = JSON.parse(readFileSync(path.join(langDir, 'labels-fr.json'), 'utf8'));
    const repo = /** @type {Record<string, Record<string, string>>} */ (frLabels);
    assert.equal(
        resolveRichTextLabel(RICH_TEXT_LABEL_KEYS.bold, repo),
        'Gras',
    );
    assert.equal(
        resolveRichTextLabel(RICH_TEXT_LABEL_KEYS.linkApply, repo),
        'Appliquer',
    );
    assert.ok(RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.toolbar]);
    assert.equal(RICH_TEXT_LANG_CONTAINER, 'core_ux');
});

test('20. disabled state disables toolbar and editor', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text disabled value="&lt;p&gt;Locked&lt;/p&gt;"></core-rich-text>');
    const editor = host.querySelector('.core-rich-text__editor');
    const boldBtn = host.querySelector('[data-rich-text-tool="bold"]');
    assert.equal(editor?.getAttribute('contenteditable'), 'false');
    assert.equal(boldBtn?.disabled, true);
    assert.ok(host.querySelector('.core-rich-text--disabled'));
});

test('UTF-8 accents are counted and preserved in plain text', () => {
    const html = '<p>Été café naïve</p>';
    assert.equal(getPlainTextFromHtml(html), 'Été café naïve');
    assert.equal(getRichTextPlainLength(html), 14);
});

test('normalizeRichTextHtml strips empty blocks', () => {
    const input = '<p></p><p>Text</p><div><br></div>';
    const output = normalizeRichTextHtml(input);
    assert.equal(output, '<p>Text</p>');
});

test('sanitizeRichTextHtml keeps lists and links', () => {
    const input = '<ul><li>One</li></ul><a href="https://example.com">Link</a>';
    const output = sanitizeRichTextHtml(input);
    assert.match(output, /<ul><li>One<\/li><\/ul>/);
    assert.match(output, /href="https:\/\/example.com"/);
});

test('core-rich-text setHtml does not fire input event', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    let inputCount = 0;
    host.addEventListener('core-rich-text-input', () => {
        inputCount += 1;
    });
    host.setHtml('<p>Updated</p>');
    assert.equal(inputCount, 0);
});

test('compact toolbar preset keeps minimal controls', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text toolbar="compact"></core-rich-text>');
    assert.ok(host.querySelector('[data-rich-text-tool="bold"]'));
    assert.equal(host.querySelector('[data-rich-text-tool="bullet-list"]'), null);
    assert.equal(host.querySelector('[data-rich-text-tool="text-color"]'), null);
});

test('link panel is rendered and validates URLs without window.prompt', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    const panel = host.querySelector('.core-rich-text__link-panel');
    const urlInput = host.querySelector('[data-rich-text-link-url]');
    const applyBtn = host.querySelector('[data-rich-text-link-apply]');
    const errorEl = host.querySelector('[data-rich-text-link-error]');

    assert.ok(panel);
    assert.ok(urlInput);
    assert.ok(applyBtn);
    assert.ok(errorEl);
    assert.equal(panel.hasAttribute('hidden'), true);

    urlInput.value = 'javascript:alert(1)';
    applyBtn.dispatchEvent(new Event('click', { bubbles: true }));

    assert.equal(host.getHtml().includes('javascript:'), false);
    assert.equal(errorEl.hidden, false);
    assert.ok(urlInput.classList.contains('core-control--error'));
});

test('paste plain text wraps lines as paragraphs', () => {
    const safe = sanitizeRichTextPaste('', 'Line one\nLine two');
    assert.match(safe, /<p>Line one<\/p>/);
    assert.match(safe, /<p>Line two<\/p>/);
});

test('preserves consumer host data-core-lang after render', async () => {
    const consumerLang = JSON.stringify([
        { container: 'journeys', name: 'update_body_field', attribute: 'label' },
        { container: 'journeys', name: 'update_body_placeholder', attribute: 'placeholder' },
    ]);

    const { installLangService, uninstallLangService, processLang } = await import('./rich-text-lang-test-helper.mjs');
    installLangService({
        journeys: {
            update_body_field: 'Corps FR',
            update_body_placeholder: 'Saisie FR',
        },
        core_ux: {
            rich_text_bold: 'Gras',
            rich_text_text_color: 'Couleur du texte',
        },
    });

    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    document.body.innerHTML = '';
    const host = document.createElement('core-rich-text');
    host.setAttribute('data-core-lang', consumerLang);
    document.body.appendChild(host);

    assert.equal(host.getAttribute('data-core-lang'), consumerLang);
    assert.equal(host.getAttribute('label'), 'Corps FR');
    assert.equal(host.getAttribute('placeholder'), 'Saisie FR');

    const boldBtn = host.querySelector('[data-rich-text-tool="bold"]');
    const colorInput = host.querySelector('[data-rich-text-color]');
    assert.equal(boldBtn?.getAttribute('aria-label'), 'Gras');
    assert.equal(colorInput?.getAttribute('aria-label'), 'Couleur du texte');
    assert.notEqual(colorInput?.getAttribute('aria-label'), 'Text color');

    processLang(host);
    assert.equal(host.getAttribute('data-core-lang'), consumerLang);
    assert.equal(boldBtn?.getAttribute('aria-label'), 'Gras');

    uninstallLangService();
});

test('lang.process(root) alone skips root consumer entries (Core_LangService semantics)', async () => {
    const consumerLang = JSON.stringify([
        { container: 'journeys', name: 'update_body_field', attribute: 'label' },
    ]);

    const { installLangService, uninstallLangService, processLang } = await import('./rich-text-lang-test-helper.mjs');
    installLangService({
        journeys: { update_body_field: 'Corps FR' },
    });

    document.body.innerHTML = '';
    const host = document.createElement('div');
    host.setAttribute('data-core-lang', consumerLang);
    document.body.appendChild(host);

    processLang(host);

    assert.equal(host.hasAttribute('label'), false);

    uninstallLangService();
});

test('lang process updates internal hooks without rebuilding host data-core-lang', async () => {
    const consumerLang = JSON.stringify([
        { container: 'journeys', name: 'update_body_field', attribute: 'label' },
    ]);

    const {
        installLangService,
        uninstallLangService,
        getLangService,
        setLangLabels,
        applyRichTextLangProcessing,
    } = await import('./rich-text-lang-test-helper.mjs');
    installLangService({
        journeys: { update_body_field: 'Label A' },
        core_ux: { rich_text_bold: 'Bold A' },
    });

    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = document.createElement('core-rich-text');
    host.setAttribute('data-core-lang', consumerLang);
    document.body.innerHTML = '';
    document.body.appendChild(host);
    const boldBtn = host.querySelector('[data-rich-text-tool="bold"]');
    assert.equal(boldBtn?.getAttribute('aria-label'), 'Bold A');

    setLangLabels({
        journeys: { update_body_field: 'Label B' },
        core_ux: { rich_text_bold: 'Bold B' },
    });
    applyRichTextLangProcessing(host, getLangService());

    assert.equal(host.getAttribute('data-core-lang'), consumerLang);
    assert.equal(host.getAttribute('label'), 'Label B');
    assert.equal(boldBtn, host.querySelector('[data-rich-text-tool="bold"]'));
    assert.equal(boldBtn?.getAttribute('aria-label'), 'Bold B');

    uninstallLangService();
});

test('link panel exposes aria-labelledby on the dialog', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    const panel = host.querySelector('.core-rich-text__link-panel');
    const title = host.querySelector('[data-rich-text-link-title]');
    assert.ok(panel);
    assert.ok(title?.id);
    assert.equal(panel.getAttribute('aria-labelledby'), title.id);
});

test('link panel Cancel restores saved selection and closes', async () => {
    const { installSelectionShim } = await import('./rich-text-selection-test-helper.mjs');
    const selection = installSelectionShim();

    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    selection.setRange(1, 4);

    host.querySelector('[data-rich-text-tool="link"]')?.dispatchEvent(new Event('click', { bubbles: true }));

    const panel = host.querySelector('.core-rich-text__link-panel');
    assert.equal(panel?.hidden, false);

    host.querySelector('[data-rich-text-link-cancel]')?.dispatchEvent(new Event('click', { bubbles: true }));

    assert.equal(panel?.hidden, true);
    const restored = selection.getRestoredRange();
    assert.ok(restored);
    assert.equal(restored.start, 1);
    assert.equal(restored.end, 4);
});

test('link panel Escape restores saved selection and closes', async () => {
    const { installSelectionShim } = await import('./rich-text-selection-test-helper.mjs');
    const selection = installSelectionShim();

    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    selection.setRange(2, 6);

    host.querySelector('[data-rich-text-tool="link"]')?.dispatchEvent(new Event('click', { bubbles: true }));

    const urlInput = host.querySelector('[data-rich-text-link-url]');
    urlInput?.dispatchEvent(Object.assign(new Event('keydown', { bubbles: true }), { key: 'Escape' }));

    assert.equal(host.querySelector('.core-rich-text__link-panel')?.hidden, true);
    const restored = selection.getRestoredRange();
    assert.ok(restored);
    assert.equal(restored.start, 2);
    assert.equal(restored.end, 6);
});

test('link panel Apply restores selection, creates link, and closes', async () => {
    const { installSelectionShim } = await import('./rich-text-selection-test-helper.mjs');
    const selection = installSelectionShim();

    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    const host = mountRichText('<core-rich-text></core-rich-text>');
    selection.setRange(0, 5);

    host.querySelector('[data-rich-text-tool="link"]')?.dispatchEvent(new Event('click', { bubbles: true }));

    const urlInput = host.querySelector('[data-rich-text-link-url]');
    urlInput.value = 'https://example.com';
    host.querySelector('[data-rich-text-link-apply]')?.dispatchEvent(new Event('click', { bubbles: true }));

    assert.equal(host.querySelector('.core-rich-text__link-panel')?.hidden, true);
    assert.deepEqual(selection.getExecLog(), [{ command: 'createLink', value: 'https://example.com' }]);
    const restored = selection.getRestoredRange();
    assert.ok(restored);
    assert.equal(restored.start, 0);
    assert.equal(restored.end, 5);
});
