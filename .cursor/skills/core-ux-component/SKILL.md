---
name: core-ux-component
description: Adds or modifies a CORE_UX core-* kit component. Use when creating UI kit tags, styles, or doc pages in CORE_UX/components/.
---

# CORE_UX — component

## Before coding

1. Confirm **presentation-only** — no `$svc('ajax')`, no app domain. See `ai-instructions/README.md`, `ai-instructions/layering.md`.
2. Read `.cursor/rules/core-ux-components.mdc` and `ai-instructions/components.md`.
3. Lifecycle/bindings: `CORE_JS/.cursor/rules/core-js-components.mdc` when CORE_JS is in the workspace; otherwise `CORE_JS/ai-instructions/components.md`.

## Steps

1. Create `components/core-<name>/core-<name>.js`.
2. Extend `Core_UXElement`, `Core_UXSlotElement`, or `Core_UXFormControl`.
3. Implement `onConnect()`, `ui_render()`, `ui_toFunctional()` as needed.
4. `registerCoreComponent('core-<name>', Class)` at module bottom.
5. Styles in `styles/core-ux.css` — token utilities only (`.cursor/rules/core-ux-theming.mdc`).
6. **Documentation (mandatory, same change set):**
   - `doc/components/core-<name>.html` — attributes, events, live demos
   - `doc/assets/sidebar.js` if catalog changes
7. `npm run build` if styles changed.

## Anti-patterns

| Wrong | Right |
|-------|-------|
| `$svc('ajax')` or REST in component | Emit events; app handles domain |
| Handlebars template | `ui_render()` pure DOM |
| `gray-500`, hex in CSS | `--core-*` tokens |
| Ship without doc page | Update `doc/components/` always |
| Import from a consuming app | Forbidden — kit is generic |

## References

- `ai-instructions/components.md`
- `ai-instructions/theming.md`
- `doc/index.html`

## App follow-up (outside this repo)

If app templates use the new tag → add import in the app's curated entry file — see `ai-instructions/app-integration.md`.
