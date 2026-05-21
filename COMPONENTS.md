# CORE_UX components

Responsive, mobile-first kit. Register via `import 'CORE_UX/index.js'`.

Components extend `Core_HTMLElement` via `Core_UXElement` and render with `ui_render()` (no Handlebars in CORE_UX).

## Actions

| Tag | Notes |
|-----|--------|
| `<core-button>` | `variant` primary \| secondary \| ghost \| danger; `size` sm \| lg; `block`; `label` |
| `<core-link>` | `href`, `label`, `external` |

## Forms

| Tag | Notes |
|-----|--------|
| `<core-field>` | `type` text \| email \| password \| number \| tel \| url \| search; `label`, `hint`, `error` |
| `<core-textarea>` | `rows`, `label`, `hint`, `error` |
| `<core-select>` | `options` JSON `[{ "value", "label", "selected"? }]` |
| `<core-checkbox>` | `label`, `checked`, `value` |
| `<core-radio-group>` | `name`, `options` JSON, `layout` stack \| inline |

## Feedback

| Tag | Notes |
|-----|--------|
| `<core-alert>` | `variant` info \| success \| warning \| error; `dismissible` |
| `<core-badge>` | `variant` neutral \| primary \| success \| warning \| error |
| `<core-spinner>` | `size` sm \| md \| lg |

## Layout

| Tag | Notes |
|-----|--------|
| `<core-container>` | `size` sm \| md \| lg \| xl \| fluid — wraps light DOM |
| `<core-stack>` | `direction` col \| row; `gap` 1–6; `align` center; `justify` between |
| `<core-grid>` | `cols` 1 \| 2 \| 3 \| 4 \| auto |
| `<core-divider>` | optional `label` |
| `<core-card>` | `title`, `subtitle`; body = children; footer = child with `data-core-footer` |

## Overlay

| Tag | Notes |
|-----|--------|
| `<core-modal>` | `open`, `title`, `size` sm \| lg \| full; event `core-modal-close` |

## Examples

```html
<core-stack direction="row" gap="4" justify="between">
  <core-field label="Email" type="email" placeholder="you@example.com"></core-field>
  <core-button variant="primary" label="Send"></core-button>
</core-stack>

<core-grid cols="auto">
  <core-card title="Step 1">Content</core-card>
  <core-card title="Step 2">Content</core-card>
</core-grid>
```

Rebuild CSS after kit changes: `npm run build` in `CORE_UX`.
