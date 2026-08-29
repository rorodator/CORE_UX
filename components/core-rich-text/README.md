# core-rich-text

WYSIWYG rich-text form control for CORE_UX. Presentation-only — no app domain logic.

## Usage

```html
<core-rich-text
  label="Body"
  name="body"
  placeholder="Write here…"
  maxlength="2000"
  toolbar="narrative"
></core-rich-text>
```

```javascript
import 'CORE_UX/components/core-rich-text/core-rich-text.js';
```

## Public API

| Surface | Description |
|---------|-------------|
| `value` attribute | Sanitized HTML (synced with editor and hidden input) |
| `name` | Hidden input name for form posts |
| `maxlength` | Optional plain-text limit (UTF-16 code units, same as HTML `maxlength`) |
| `toolbar` | `full` (default), `narrative`, or `compact` |
| `sanitize` | Default `true`; set `false` to skip client whitelist (not recommended) |
| `getHtml()` | Sanitized HTML fragment |
| `getText()` | Plain text extracted from HTML — **reference for maxlength** |
| `setHtml(html)` | Sets content; sanitizes by default |
| `isMaxLengthExceeded()` | `true` when plain text length exceeds `maxlength` |
| `core-rich-text-input` | `{ html, text, maxLengthExceeded }` while editing |
| `core-rich-text-change` | Same detail on blur |

## HTML vs plain text

- **HTML** (`getHtml()`, hidden input, `value`) may include markup (`<strong>`, lists, links, …).
- **Plain text** (`getText()`) is visible content only. Example: `<p><strong>Hello</strong></p>` → `"Hello"` (5 characters).
- **`maxlength` always applies to plain text**, never to serialized HTML length.

When `maxlength` is exceeded, the editor sets `aria-invalid="true"` and `data-maxlength-exceeded` without truncating HTML.

## Toolbar presets

| Preset | Tools |
|--------|-------|
| `full` | Bold, italic, underline, lists, link, color, alignment (L/C/R), clear formatting |
| `narrative` | Same without alignment — suited to posts/stories |
| `compact` | Bold, italic, underline, link, clear formatting |

## Sanitization contract

Client whitelist (`lib/html/rich-text-html.js`):

- **Tags:** `p`, `br`, `strong`, `b`, `em`, `i`, `u`, `ul`, `ol`, `li`, `a`, `span`, `div`
- **Attributes:** `href`, `target`, `rel` on links; `style` on `span`/`p`/`div` (color and text-align only)
- **Rejected:** `script`, `iframe`, `object`, `embed`, `img`, `on*` handlers, `javascript:`, `data:` URLs, arbitrary CSS

Paste and `setHtml()` run through the same sanitizer.

**Always sanitize again on the server before persisting or rendering stored HTML.**

Helpers: `sanitizeRichTextHtml`, `normalizeRichTextHtml`, `sanitizeRichTextPaste`, `getPlainTextFromHtml`.

## i18n

Toolbar and link-dialog strings use `data-core-lang` on **internal hooks** (container `core_ux`). The host `data-core-lang` attribute is reserved for consuming apps and is never overwritten by the component.

Reference catalogues for consuming apps: `CORE_UX/lang/labels-{en,fr,es,de}.json` — merge the `core_ux` section into your app label API.

Label keys are exported as `RICH_TEXT_LABEL_KEYS` from the component module.

English fallbacks remain in the DOM when lang service is inactive (doc demos).

## Link insertion

Selecting text and clicking the link tool opens an inline panel (no `window.prompt`). URLs are validated with `sanitizeRichTextHref` (`https:`, `mailto:`, `#`, `/`, `?` only).

## Known debt (V1)

- Formatting uses `document.execCommand()` (deprecated but acceptable for this V1).
- Maxlength signals invalid state; it does not block typing or truncate content.
