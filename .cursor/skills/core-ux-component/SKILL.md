---
name: core-ux-component
description: Adds or modifies a CORE_UX core-* kit component. Use when creating UI kit tags, styles, or doc pages in CORE_UX/components/.
---

# CORE_UX — component

## Before coding

1. Confirm **presentation-only** — no `$svc('ajax')`, no app domain. See `ai-instructions/README.md`, `ai-instructions/layering.md`.
2. Read `.cursor/rules/core-ux-components.mdc`, `.cursor/rules/core-ux-documentation.mdc`, `ai-instructions/components.md`, and `ai-instructions/ux-quality.md`.

## Steps

1. Create `components/core-<name>/core-<name>.js`.
2. Extend `Core_UXElement`, `Core_UXSlotElement`, or `Core_UXFormControl`.
3. Implement `onConnect()`, `ui_render()`, `ui_toFunctional()` as needed.
4. `registerCoreComponent('core-<name>', Class)` at module bottom.
5. Styles in `styles/core-ux.css` — token utilities only (`.cursor/rules/core-ux-theming.mdc`).
6. **Documentation (mandatory, same change set):**
   - `doc/components/core-<name>.html` — attributes, events, API, live demos
   - `doc/assets/sidebar.js` — nav links + brand page/tag counts
   - `doc/index.html` — hero counts + card-grid when catalog changes
   - `COMPONENTS.md` — short index
   - `doc/form-controls.html` when shared form attrs scope changes
   - See `.cursor/rules/core-ux-documentation.mdc`
7. `npm run build` if styles changed.
8. Verify keyboard behavior, accessible names, focus visibility, narrow layout, reduced motion, and every exposed state.

## Anti-patterns

| Wrong | Right |
|-------|-------|
| `$svc('ajax')` or REST in component | Emit events; app handles domain |
| Handlebars template | `ui_render()` pure DOM |
| `gray-500`, hex in CSS | `--core-*` tokens |
| Ship without doc page | Update `doc/components/` always |
| Import from a consuming app | Forbidden — kit is generic |
| Undocumented attribute value used by an app | Add implementation + styles + docs + demo, or use a documented value |

## References

- `ai-instructions/components.md`
- `ai-instructions/theming.md`
- `doc/index.html`

## Optional (sibling CORE_JS repo)

Full platform lifecycle: `CORE_JS/ai-instructions/components.md`.

## App follow-up (outside this repo)

If app templates use the new tag → add import in the app's curated entry file — see `ai-instructions/app-integration.md`.
