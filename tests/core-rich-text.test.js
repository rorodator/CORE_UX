import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    escapeHtml,
    getPlainTextFromHtml,
    normalizeRichTextHtml,
    sanitizeRichTextHtml,
    sanitizeRichTextHref,
    sanitizeRichTextStyle,
} from '../lib/html/rich-text-html.js';

test('escapeHtml escapes markup characters', () => {
    assert.equal(escapeHtml('a & b <c> "d"'), 'a &amp; b &lt;c&gt; &quot;d&quot;');
});

test('sanitizeRichTextHref rejects javascript URLs', () => {
    assert.equal(sanitizeRichTextHref('javascript:alert(1)'), null);
    assert.equal(sanitizeRichTextHref('https://example.com'), 'https://example.com');
    assert.equal(sanitizeRichTextHref('/relative/path'), '/relative/path');
});

test('sanitizeRichTextStyle keeps color and text-align only', () => {
    assert.equal(sanitizeRichTextStyle('color: #112233; text-align: center'), 'color: #112233; text-align: center');
    assert.equal(sanitizeRichTextStyle('background: red; color: blue'), 'color: blue');
    assert.equal(sanitizeRichTextStyle('position: absolute'), null);
});

test('sanitizeRichTextHtml removes scripts and unsafe tags', () => {
    const input = '<p>Hello</p><script>alert(1)</script><img src=x onerror=alert(1)><strong>World</strong>';
    const output = sanitizeRichTextHtml(input);
    assert.ok(output.includes('<strong>World</strong>'));
    assert.ok(output.includes('Hello'));
    assert.equal(output.includes('script'), false);
    assert.equal(output.includes('img'), false);
});

test('sanitizeRichTextHtml keeps lists and links', () => {
    const input = '<ul><li>One</li></ul><a href="https://example.com">Link</a>';
    const output = sanitizeRichTextHtml(input);
    assert.match(output, /<ul><li>One<\/li><\/ul>/);
    assert.match(output, /href="https:\/\/example.com"/);
    assert.match(output, /rel="noopener noreferrer"/);
});

test('normalizeRichTextHtml strips empty blocks', () => {
    const input = '<p></p><p>Text</p><div><br></div>';
    const output = normalizeRichTextHtml(input);
    assert.equal(output, '<p>Text</p>');
});

test('getPlainTextFromHtml returns readable text', () => {
    assert.equal(getPlainTextFromHtml('<p>Hello <strong>world</strong></p>'), 'Hello world');
});

test('core-rich-text exposes value and events', async () => {
    await import('../components/core-rich-text/core-rich-text.js');
    await customElements.whenDefined('core-rich-text');

    document.body.innerHTML = '<core-rich-text name="body" label="Body"></core-rich-text>';
    const host = document.body.firstElementChild;
    assert.ok(host);

    host.setHtml('<p>Initial <strong>text</strong></p>');
    assert.match(host.getHtml(), /<strong>text<\/strong>/);
    assert.equal(host.getText(), 'Initial text');

    const hidden = host.querySelector('input[type="hidden"]');
    assert.ok(hidden);
    assert.equal(hidden.name, 'body');
    assert.match(hidden.value, /Initial/);

    let inputCount = 0;
    host.addEventListener('core-rich-text-input', () => {
        inputCount += 1;
    });
    host.setHtml('<p>Updated</p>');
    assert.equal(inputCount, 0);

    const editor = host.querySelector('.core-rich-text__editor');
    assert.ok(editor);
    editor.innerHTML = '<p>Typed</p>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(inputCount, 1);
    assert.equal(host.getText(), 'Typed');
});
