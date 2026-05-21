# CORE_UX components

## Role

- Reusable presentation layer: `<core-*>` custom elements + prebuilt CSS.
- No business logic, no `$svc('ajax')` in CORE_UX.
- Renders with `ui_render()` (pure DOM) — no Handlebars in this repo.
- Extends `Core_HTMLElement` from CORE_JS via `Core_UXElement`.

## Base classes

| Class | Path | Use |
|-------|------|-----|
| `Core_UXElement` | `lib/base/core-ux-element.js` | Default base |
| `Core_UXSlotElement` | `lib/base/core-ux-slot-element.js` | Preserves light-DOM children |
| `Core_UXFormControl` | `lib/base/core-ux-form-control.js` | Labelled inputs |

## Adding a component

1. Create `components/core-<name>/core-<name>.js`.
2. Extend the appropriate base class; implement `onConnect()`, `ui_render()`, `ui_toFunctional()` if needed.
3. Call `registerCoreComponent('core-<name>', Class)` at module bottom.
4. Import in `index.js` (barrel) if part of the full kit.
5. Add Tailwind/classes in `styles/core-ux.css`; run `npm run build`.
6. **Update documentation** (same change set):
   - `doc/components/core-<name>.html` — attributes, events, API, **live demos**
   - `doc/assets/sidebar.js` — if adding/removing a tag from the catalog
   - Optionally `COMPONENTS.md` (short index)
7. Run `npm run build` if styles changed.

## Documentation maintenance (mandatory)

**Any change to the component library must update the HTML reference:**

| Change | Update |
|--------|--------|
| New `<core-*>` tag | New `doc/components/core-<name>.html` + entry in `doc/assets/sidebar.js` |
| Removed tag | Delete page + sidebar entry |
| New/changed attribute | Attribute table + demo on component page |
| New/changed event or public method | Events/API section + demo if applicable |
| Slot or footer pattern change | Architecture page and affected component pages |

Structure: **`CORE_UX/doc/`** — one page per component with doc + live demos (English). Do not ship component changes without syncing the doc.

## Conventions

- Tag names: `core-<name>` (kebab-case).
- Boolean attrs: present and not `"false"` → true (`hasBoolAttr`).
- JSON attrs: `parseJsonAttr` with safe fallback.
- Register via `registerCoreComponent`; apps may import subsets (e.g. `core-ux-myjourney.js`).

## i18n

- Form controls mirror `data-core-lang` to inner controls.
- Autocomplete supports `*-container` / `*-key` pairs resolved via `$svc('lang')` when available.
