# Theming — CORE_UX

Token-first design system. Human reference: [THEMING.md](../THEMING.md), live demos: [doc/theming.html](../doc/theming.html). Cursor rule: `.cursor/rules/core-ux-theming.mdc`.

## Principle

Every visual in the kit routes through semantic CSS custom properties (`--core-*`). Consuming apps theme at runtime — **no kit rebuild** for brand colours.

## App setup

```html
<body class="core-ux-root">
```

```css
/* app-theme.css — load AFTER CORE_UX/dist/core-ux.css */
.core-ux-root {
  --core-color-primary: #2563eb;
  --core-color-surface: #ffffff;
}
```

```javascript
import 'CORE_UX/dist/core-ux.css';
import './app-theme.css';
```

## Rules for kit authors

| Rule | Detail |
|------|--------|
| Tokens | Define defaults in `styles/tokens.css` |
| Tailwind | `tailwind.preset.js` → `var(--core-…)` only |
| Component CSS | `@apply` with `core-*` utilities in `styles/core-ux.css` |
| No palette literals | No raw `gray-*`, hex in preset or component styles |
| Document | New token → `THEMING.md` + `doc/theming.html` |

## Dark mode

Built-in: `data-core-theme="dark"` on `.core-ux-root`. Apps may define their own dark overrides on `.core-ux-root[data-core-theme="dark"]`.

## App anti-patterns

| Wrong | Right |
|-------|-------|
| Patch `.core-button` rules in app CSS | Override `--core-*` on `.core-ux-root` |
| Hardcode colours in MyJourney templates | Use kit components + tokens |
| Rebuild CORE_UX for one app brand | Runtime variable overrides |
