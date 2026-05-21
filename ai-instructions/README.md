# AI instructions — CORE_UX

Guidance for AI-assisted work on the shared UI kit.

| File | Topic |
|------|--------|
| [components.md](./components.md) | Component conventions, doc maintenance |

## HTML reference

Human-readable catalog with **live demos**: open **`doc/index.html`** in a browser (via local HTTP server).

| Path | Content |
|------|---------|
| `doc/index.html` | Home + links to all components |
| `doc/getting-started.html` | Install, architecture, conventions |
| `doc/form-controls.html` | Shared form attributes |
| `doc/components/core-*.html` | One page per tag — attributes table + interactive demos |

Shared assets: `doc/assets/doc.css`, `bootstrap.js`, `load-kit.js`, `sidebar.js`, `core-html-element-shim.js` (minimal `Core_HTMLElement` for browser demos). Stylesheet: `<link href="../dist/core-ux.css">` in each page — `load-kit.js` imports component JS only (not `index.js`, which pulls CSS as an ES module).

**Important:** open via HTTP (`php -S localhost:8765 -t .` → `/doc/`). `file://` will not load ES modules.

When adding, removing, or changing a `<core-*>` component, update the matching page under `doc/components/` (and sidebar in `doc/assets/sidebar.js` if the catalog changes).
