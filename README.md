# CORE_UX

Shared UI kit (custom elements + CSS) for CORE-based applications.

## Role

- **CORE_JS** — application platform (`$svc`, router, `Core_HTMLElement`, ajax, i18n).
- **CORE_UX** — reusable presentation layer (`<core-*>` components, design tokens, prebuilt CSS).
- **App** (e.g. MyJourney) — business UI (`<mj-*>`) and feature pages.

CORE_UX **depends on** CORE_JS; CORE_JS does not import CORE_UX.

## CSS build (encapsulated in CORE_UX)

Tailwind runs **only here**, not in consuming apps (unless the app adds custom utilities later).

```bash
cd CORE_UX
npm install
npm run build    # styles/core-ux.css → dist/core-ux.css
npm run watch    # during kit development
```

Applications import `CORE_UX/index.js`, which loads `dist/core-ux.css` (plain CSS, no PostCSS/Tailwind in the app).

MyJourney runs `npm run build:core-ux` automatically before webpack (`prebuild`).

## Installation

Symlink in the project root:

```
CORE_UX -> ../CORE/CORE_UX
```

Webpack alias: `CORE_UX` → `../../CORE/CORE_UX`.

## Usage

```javascript
import 'CORE_UX/index.js';
```

```html
<body class="core-ux-root">
<core-button variant="primary" label="Save"></core-button>
```

## Theming

All visuals use **semantic CSS variables** (`--core-*`). Override on `.core-ux-root` in your app — no kit rebuild.

```css
/* app-theme.css — load after dist/core-ux.css */
.core-ux-root {
  --core-color-primary: #6366f1;
  --core-radius: 0.5rem;
}
```

See **[THEMING.md](./THEMING.md)** and [doc/theming.html](./doc/theming.html) (live demo).

## Structure

- `components/` — `<core-*>` custom elements (`ui_render()` in JS, no Handlebars)
- `styles/tokens.css` — semantic CSS custom properties (`--core-*` defaults)
- `styles/core-ux.css` — Tailwind source (`@tailwind`, `@apply`)
- `dist/core-ux.css` — compiled kit stylesheet (includes tokens)
- `THEMING.md` — runtime theming contract for consuming apps
- `lib/base/` — `Core_UXElement`, `Core_UXSlotElement`, `Core_UXFormControl`
- `lib/utils/dom.js` — DOM helpers (`createElement`, `mountHtml`)
- `tailwind.preset.js` — design tokens (for kit build or future app Tailwind)
- `tailwind.content.js` — content globs export (future app use only)

## Component catalog

- **[doc/index.html](./doc/index.html)** — home; links to one page per component (doc + live demos).
- [COMPONENTS.md](./COMPONENTS.md) — short markdown index.

When adding, removing, or modifying a component, update `doc/index.html` in the same change (see [ai-instructions/components.md](./ai-instructions/components.md)).

## Conventions

- Tag names: `core-<name>` (kebab-case).
- No business logic or `$svc('ajax')` in CORE_UX.
- App-specific widgets: `<mj-*>` in the application repo.
