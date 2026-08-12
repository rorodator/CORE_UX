# AI instructions — CORE_UX

Guidance for AI-assisted work on the shared UI kit.

**Cursor rules:** `.cursor/rules/core-ux-components.mdc`, `.cursor/rules/core-ux-theming.mdc`, `.cursor/rules/encapsulation.mdc`  
**Workflow skill:** `.cursor/skills/core-ux-component/SKILL.md`

## Maintaining rules & skills

Add or update **`.cursor/rules/`**, **`ai-instructions/`**, and **`.cursor/skills/`** in **this repo** when the change is:

- `<core-*>` components, kit CSS/tokens, theming, or doc pages under `doc/components/`.

Do **not** put kit rules in consuming apps — apps keep a thin bridge rule for subset imports. See [encapsulation.md](./encapsulation.md), [layering.md](./layering.md).

## Layering (mandatory)

CORE_UX is the **middle doll**: generic `<core-*>` presentation on top of **CORE_JS** only.

| Put in CORE_UX | Put elsewhere |
|----------------|---------------|
| Reusable UI (`<core-button>`, `<core-tooltip>`, tokens, kit CSS) | **Consuming app** — feature UI, business logic, app services |
| Pure DOM rendering, no `$svc('ajax')`, no domain rules | **CORE_JS** — base classes, utils, platform `$svc()` |

**Never** import from a consuming app. **Never** add code that belongs in CORE_JS (promote primitives downward).

Full nesting rules: [layering.md](./layering.md).

| File | Topic |
|------|--------|
| [encapsulation.md](./encapsulation.md) | Repo boundaries, dual context |
| [layering.md](./layering.md) | Stack placement (standalone-safe) |
| [components.md](./components.md) | `<core-*>` conventions, doc maintenance |
| [theming.md](./theming.md) | `--core-*` tokens, app overrides |
| [app-integration.md](./app-integration.md) | Subset imports, CSS, app entry pattern |
| [../THEMING.md](../THEMING.md) | Human-readable theming reference |
| [../COMPONENTS.md](../COMPONENTS.md) | Short component index |

## HTML reference

Human-readable catalog with **live demos**: open **`doc/index.html`** in a browser (via local HTTP server).

| Path | Content |
|------|---------|
| `doc/index.html` | Home + links to all components |
| `doc/getting-started.html` | Install, architecture, conventions |
| `doc/theming.html` | Design tokens + live theme presets |
| `doc/form-controls.html` | Shared form attributes |
| `doc/components/core-*.html` | One page per tag — attributes table + interactive demos |

Shared assets: `doc/assets/doc.css`, `bootstrap.js`, `load-kit.js`, `sidebar.js`, `core-html-element-shim.js`, `core-dom-shim.js` (doc shims for `CORE_JS` without full bootstrap — **keep `core-dom-shim.js` in sync with `CORE_JS/lib/utils/dom.js`**). Stylesheet: `<link href="../dist/core-ux.css">` in each page — `load-kit.js` imports component JS only (not `index.js`, which pulls CSS as an ES module).

**Important:** open via HTTP (`php -S localhost:8765 -t .` → `/doc/`). `file://` will not load ES modules. When changing `CORE_JS/lib/utils/dom.js`, sync `doc/assets/core-dom-shim.js`.

When adding, removing, or changing a `<core-*>` component, update the matching page under `doc/components/` (and sidebar in `doc/assets/sidebar.js` if the catalog changes).
