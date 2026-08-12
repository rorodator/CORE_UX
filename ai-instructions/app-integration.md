# App integration — CORE_UX

How **consuming apps** use the kit without importing the full barrel. Works whether CORE_UX is symlinked or installed as a sibling dependency.

## Recommended pattern (subset imports)

1. Import compiled CSS once:

```javascript
import 'CORE_UX/dist/core-ux.css';
```

2. Import **only** `<core-*>` tags used in app templates:

```javascript
import 'CORE_UX/components/core-button/core-button.js';
import 'CORE_UX/components/core-modal/core-modal.js';
```

3. Wrap app shell with `class="core-ux-root"` on `<body>` (or root container).

4. Optional app theme CSS loaded after kit CSS — see [theming.md](./theming.md).

5. Compose global chrome once in the app shell (header, overlays, notification host, skip link). Routed pages own only page content and page actions.

## Do not use in production apps

```javascript
import 'CORE_UX/index.js';  // barrel — loads ALL components + CSS as ES module
```

Use `index.js` only for full-kit demos or rapid prototyping. Apps keep an explicit entry file (e.g. `core-ux-<appname>.js`) so webpack tree-shakes unused tags.

## When adding a `<core-*>` tag to an app template

1. Add static import in the app's CORE_UX entry file.
2. Rebuild app webpack bundle.
3. If the tag is **new in CORE_UX**, follow skill `core-ux-component` — doc page + sidebar required **in this repo**.

## CSS build

Kit styles change in **CORE_UX** only:

```bash
cd CORE_UX && npm run build   # → dist/core-ux.css
```

Consuming apps typically run this in `prebuild`.

## Theming

Override `--core-*` on `.core-ux-root` — see [theming.md](./theming.md).

## Reference catalog

- Browser doc + live demos: `doc/index.html` (serve via HTTP, not `file://`).
- Component conventions: [components.md](./components.md).
- Composition, state, and accessibility baseline: [ux-quality.md](./ux-quality.md).

## Example (optional)

Some apps keep a curated entry file next to their webpack sources, e.g. `JS/core-ux-myjourney.js` importing only the tags used in that product's templates. The exact path is **app-specific** — the pattern above is what matters.

Consuming apps may also add a **bridge rule** in their own `.cursor/rules/` for import reminders; that lives in the app repo, not here.
