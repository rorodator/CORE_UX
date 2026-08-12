# Encapsulation — CORE_UX

**Before adding code, rules, or skills:** confirm it belongs in **CORE_UX** (generic UI kit), not CORE_JS, CORE_PHP, or a consuming app.

## This repo (CORE_UX)

| Belongs here | Does not belong here |
|--------------|----------------------|
| `<core-*>` components, tokens, `dist/core-ux.css`, kit doc pages | `$svc('ajax')`, domain logic, app routes |
| Kit rules/skills in **this** `.cursor/` | App feature components (app-specific prefix) |
| `ui_render()` pure DOM — no Handlebars | Base classes/utils (→ CORE_JS) |

## Sibling repos

- **CORE_JS** — platform primitives, `$svc`, `Core_HTMLElement`
- **CORE_PHP** — RestService, `core()`
- **Consuming app** — product UI, domain services, subset import entry (e.g. `core-ux-<app>.js`)

Details: [layering.md](./layering.md), [app-integration.md](./app-integration.md).

## Rules & skills in this repo

When you add or change a **kit pattern** (component, token, theming):

1. Update `.cursor/rules/`, `ai-instructions/`, and `doc/components/` **here**
2. Add/update `.cursor/skills/core-ux-component/` if needed
3. Do **not** duplicate kit contracts in app repos

## Dual context

All paths in CORE_UX docs are **relative to this repository root**. They work standalone or symlinked (`CORE_UX/` in an app workspace).

CORE docs must **never require** an app file. App-specific import lists and bridge rules live in the **consuming app** — see [app-integration.md](./app-integration.md) for the generic pattern (with optional examples).

## App follow-up (outside this repo)

When a new `<core-*>` tag ships, each consuming app adds a static import in its own curated entry file — not `index.js` barrel.
