# AI instructions — CORE_UX

Guidance for AI-assisted work on the shared UI kit.

## Layering (mandatory)

CORE_UX is the **middle doll**: generic `<core-*>` presentation on top of **CORE_JS** only.

| Put in CORE_UX | Put elsewhere |
|----------------|---------------|
| Reusable UI (`<core-button>`, `<core-tooltip>`, tokens, kit CSS) | **MyJourney** — feature UI, business logic, app services |
| Pure DOM rendering, no `$svc('ajax')`, no domain rules | **CORE_JS** — base classes, utils, platform `$svc()` |

**Never** import from MyJourney. **Never** add code that belongs in CORE_JS (promote primitives downward).

Full rules: MyJourney `ai-instructions/layering.md`.

| File | Topic |
|------|--------|
| [components.md](./components.md) | Component conventions, doc maintenance |
| [../THEMING.md](../THEMING.md) | Runtime `--core-*` CSS variables (public API) |

## HTML reference

Human-readable catalog with **live demos**: open **`doc/index.html`** in a browser (via local HTTP server).

| Path | Content |
|------|---------|
| `doc/index.html` | Home + links to all components |
| `doc/getting-started.html` | Install, architecture, conventions |
| `doc/theming.html` | Design tokens + live theme presets |
| `doc/form-controls.html` | Shared form attributes |
| `doc/components/core-*.html` | One page per tag — attributes table + interactive demos |

Shared assets: `doc/assets/doc.css`, `bootstrap.js`, `load-kit.js`, `sidebar.js`, `core-html-element-shim.js`, `core-dom-shim.js` (doc shims for `CORE_JS` without full bootstrap). Stylesheet: `<link href="../dist/core-ux.css">` in each page — `load-kit.js` imports component JS only (not `index.js`, which pulls CSS as an ES module).

**Important:** open via HTTP (`php -S localhost:8765 -t .` → `/doc/`). `file://` will not load ES modules. When changing `CORE_JS/lib/utils/dom.js`, sync `doc/assets/core-dom-shim.js`.

When adding, removing, or changing a `<core-*>` component, update the matching page under `doc/components/` (and sidebar in `doc/assets/sidebar.js` if the catalog changes).
