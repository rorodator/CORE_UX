# CORE_UX components

Cursor rule: `.cursor/rules/core-ux-components.mdc`. Skill: `.cursor/skills/core-ux-component/SKILL.md`.

## Role

- Reusable presentation layer: `<core-*>` custom elements + prebuilt CSS.
- No business logic, no `$svc('ajax')` in CORE_UX.
- Renders with `ui_render()` (pure DOM) — no Handlebars in this repo.
- Extends `Core_HTMLElement` from CORE_JS via `Core_UXElement`.
- Lifecycle/bindings (daily minimum): see rule `core-ux-components.mdc` — `onConnect` → `render` → `bindDelegated`/`bindUI`.
- Optional deep dive: `CORE_JS/ai-instructions/components.md` when the sibling repo is in the workspace.

## Base classes

| Class | Path | Use |
|-------|------|-----|
| `Core_UXElement` | `lib/base/core-ux-element.js` | Default base |
| `Core_UXSlotElement` | `lib/base/core-ux-slot-element.js` | Preserves light-DOM children |
| `Core_UXFormControl` | `lib/base/core-ux-form-control.js` | Labelled inputs |

## Adding a component

1. Create `components/core-<name>/core-<name>.js`.
2. Extend the appropriate base class; implement `onConnect()`, `ui_render()`, `ui_toFunctional()` if needed.
   - Wire DOM events with `bindDelegated()` / `bindUI()` from `Core_HTMLElement` — cleaned automatically each `render()`.
   - When overriding `cleanFunctional()`, call `super.cleanFunctional()` first.
3. Call `registerCoreComponent('core-<name>', Class)` at module bottom.
4. Import in `index.js` (barrel) if part of the full kit.
5. Add Tailwind/classes in `styles/core-ux.css`; run `npm run build`.
   - Use only `core-*` token utilities — no raw `gray-*`, hex, or Tailwind palette colours (see [theming.md](./theming.md)).
6. **Update documentation** (same change set):
   - `doc/components/core-<name>.html` — attributes, events, API, **live demos**
   - `doc/assets/sidebar.js` — if adding/removing a tag from the catalog
   - Optionally `COMPONENTS.md` (short index)
7. Run `npm run build` if styles changed.
8. Review semantics, keyboard behavior, accessible names, focus, responsive behavior, and documented states against [ux-quality.md](./ux-quality.md).

## Documentation maintenance (mandatory)

**Any change to the component library must update the HTML reference:**

| Change | Update |
|--------|--------|
| New `<core-*>` tag | New `doc/components/core-<name>.html` + entry in `doc/assets/sidebar.js` |
| Removed tag | Delete page + sidebar entry |
| New/changed attribute | Attribute table + demo on component page |
| New/changed event or public method | Events/API section + demo if applicable |
| Slot or footer pattern change | Architecture page and affected component pages |
| New/changed design token | `styles/tokens.css`, `tailwind.preset.js`, [theming.md](./theming.md), `doc/theming.html` |

Structure: **`CORE_UX/doc/`** — one page per component with doc + live demos (English). Do not ship component changes without syncing the doc.

## Theming (mandatory for styles)

See [theming.md](./theming.md) and `.cursor/rules/core-ux-theming.mdc`.

## Conventions

- Tag names: `core-<name>` (kebab-case).
- Boolean attrs: present and not `"false"` → true (`hasBoolAttr`).
- JSON attrs: `parseJsonAttr` with safe fallback.
- Register via `registerCoreComponent`; apps import subsets — see [app-integration.md](./app-integration.md).
- Keep supported attribute values explicit. Update implementation, styles, the attribute table, and a live demo together.

## DOM helpers (CORE_JS)

Import from `CORE_JS/lib/utils/dom.js` or use `$svc('dom')` when AppCore is bootstrapped:

| API | Use |
|-----|-----|
| `createElement(tag, { text })` | Plain text — user/API content |
| `createElement(tag, { trustedHtml })` | Author-controlled markup only |
| `mountTrustedHtml(parent, html)` | Append template/light-DOM fragments |
| `hasBoolAttr`, `parseJsonAttr`, `mirrorAttributes` | Host attribute helpers |

**Security:** never pass user input or API data to `trustedHtml` / `mountTrustedHtml`. Use `text` instead.

Slot components (`Core_UXSlotElement`, card/modal/side-panel) capture template light DOM via `lib/dom/trusted-html.js`, then re-inject with `mountTrustedHtml`. `core-multi-select` option field: `trustedHtml` (legacy `html` alias still accepted in JSON).

## i18n

- Form controls mirror `data-core-lang` to inner controls when needed.
- `core-menu-item`: classic `data-core-lang` on the host; patches `"child": "[data-core-menu-item-label]"` before render.
- Autocomplete supports `*-container` / `*-key` pairs resolved via `$svc('lang')` when available.
- Client i18n mechanics: see `data-core-lang` usage above; optional `CORE_JS/ai-instructions/internationalization.md` for full `$svc('lang')` API.
