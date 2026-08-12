# App integration — CORE_UX

How consuming apps (MyJourney, etc.) use the kit without importing the full barrel.

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

## Do not use in production apps

```javascript
import 'CORE_UX/index.js';  // barrel — loads ALL components + CSS as ES module
```

Use `index.js` only for full-kit demos or rapid prototyping. Apps keep an explicit entry file (e.g. MyJourney `JS/core-ux-myjourney.js`) so webpack tree-shakes unused tags.

## When adding a `<core-*>` tag to an app template

1. Add static import in the app's CORE_UX entry file (`core-ux-<app>.js`).
2. Rebuild app webpack bundle.
3. If the tag is **new in CORE_UX**, follow kit skill — doc page + sidebar required in CORE_UX repo.

## CSS build

Kit styles change in **CORE_UX** only:

```bash
cd CORE_UX && npm run build   # → dist/core-ux.css
```

Apps typically run this in `prebuild` (MyJourney: `npm run build:core-ux` before webpack).

## Theming

Override `--core-*` on `.core-ux-root` — see [theming.md](./theming.md).

## Reference catalog

- Browser doc + live demos: `CORE_UX/doc/index.html` (serve via HTTP, not `file://`).
- Component conventions: [components.md](./components.md).

## MyJourney example

| File | Role |
|------|------|
| `JS/core-ux-myjourney.js` | Curated `<core-*>` imports for this app |
| `JS/index.js` | Imports `core-ux-myjourney.js` in bootstrap chain |

MyJourney bridge rule: `.cursor/rules/core-ux-app.mdc`.
