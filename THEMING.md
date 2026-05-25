# CORE_UX theming

CORE_UX is **token-first**: every visual decision in the kit routes through semantic CSS custom properties. Consuming apps (MyJourney, etc.) theme the UI by overriding those variables at runtime — **no kit rebuild required**.

## Quick start (app)

```html
<body class="core-ux-root">
```

```css
/* app-theme.css — load AFTER CORE_UX/dist/core-ux.css */
.core-ux-root {
  --core-color-primary: #6366f1;
  --core-color-primary-hover: #4f46e5;
  --core-radius: 0.5rem;
  --core-font-family: "Inter", system-ui, sans-serif;
}
```

```javascript
import 'CORE_UX/dist/core-ux.css';
import './app-theme.css';
```

## Rules

1. **Override `--core-*` variables**, not `.core-*` class rules (except edge cases).
2. Scope overrides on **`.core-ux-root`** (or `:root` if the whole page uses the kit).
3. Load app theme **after** `dist/core-ux.css`.
4. Token renames are **breaking changes** — treat this file as public API.

## Token reference

Defaults live in [`styles/tokens.css`](./styles/tokens.css).

### Brand / actions

| Variable | Role | Default |
|----------|------|---------|
| `--core-color-primary` | Primary buttons, links, focus accents | `#2185d0` |
| `--core-color-primary-hover` | Hover on primary | `#1678c2` |
| `--core-color-primary-subtle` | Ghost button hover, subtle highlights | `#e8f4fc` |
| `--core-color-on-primary` | Text/icons on primary/danger backgrounds | `#ffffff` |

### Surfaces

| Variable | Role | Default |
|----------|------|---------|
| `--core-color-surface` | Inputs, cards, panels, dropdowns | `#ffffff` |
| `--core-color-surface-muted` | Card headers/footers, toolbar backgrounds | `#f9fafb` |
| `--core-color-surface-hover` | Secondary button hover, list hovers | `#f3f4f6` |
| `--core-color-surface-active` | Stronger hover (chip remove, etc.) | `#e5e7eb` |

### Text

| Variable | Role | Default |
|----------|------|---------|
| `--core-color-text` | Body text, labels | `#1b1c1d` |
| `--core-color-text-muted` | Hints, placeholders, chevrons | `#767676` |

### Borders & overlays

| Variable | Role | Default |
|----------|------|---------|
| `--core-color-border` | Input/card borders, dividers | `#e0e1e2` |
| `--core-color-overlay` | Modal / side-panel backdrop | `rgba(0,0,0,0.45)` |
| `--core-color-overlay-subtle` | Dismiss button hover | `rgba(0,0,0,0.05)` |

### Semantic states

Each state has base, muted background, border, and on-muted text tokens.

| State | Base | Muted bg | Border | On-muted text |
|-------|------|----------|--------|---------------|
| Info | `--core-color-info` | `--core-color-info-muted` | `--core-color-info-border` | (uses `--core-color-text`) |
| Success | `--core-color-success` | `--core-color-success-muted` | `--core-color-success-border` | `--core-color-success-on-muted` |
| Warning | `--core-color-warning` | `--core-color-warning-muted` | `--core-color-warning-border` | `--core-color-warning-on-muted` |
| Error | `--core-color-error` | `--core-color-error-muted` | `--core-color-error-border` | `--core-color-error-on-muted` |

Additional: `--core-color-error-hover` (danger button hover).

Neutral badges: `--core-color-neutral-muted`, `--core-color-neutral-on-muted`.

### Focus rings

Pre-computed alpha colours — do **not** rely on Tailwind opacity modifiers with CSS variables.

| Variable | Default usage |
|----------|---------------|
| `--core-color-primary-ring` | Input focus ring |
| `--core-color-primary-ring-strong` | Checkbox / multi-select focus |
| `--core-color-error-ring` | Invalid field focus |

### Shape, typography, elevation

| Variable | Role | Default |
|----------|------|---------|
| `--core-radius` | Buttons, inputs, cards, panels | `0.28571429rem` |
| `--core-font-family` | Kit typography | system stack |
| `--core-shadow` | Cards, dropdowns | light shadow |
| `--core-shadow-sm` | Input elevation | lighter shadow |
| `--core-shadow-lg` | Modal, side-panel | large shadow |

### Layout (component behaviour)

| Variable | Role | Default |
|----------|------|---------|
| `--core-multiselect-option-height` | Row height in multi-select list | `2.75rem` |
| `--core-multiselect-list-rows` | Visible rows before scroll | `6` |

## Dark mode

Built-in dark palette: set `data-core-theme="dark"` on `.core-ux-root`.

```html
<body class="core-ux-root" data-core-theme="dark">
```

Or toggle at runtime: `document.body.dataset.coreTheme = 'dark'`.

Apps can also define their own dark overrides on `.core-ux-root[data-core-theme="dark"]`.

## What components consume

| Area | Main tokens |
|------|-------------|
| `core-button` | primary, surface, on-primary, error-hover, primary-subtle |
| Form controls | surface, border, text, primary-ring, error-ring |
| `core-alert` / `core-notif` / `core-badge` | semantic *-muted, *-border, *-on-muted |
| `core-card`, layout | surface, surface-muted, border, shadow |
| `core-modal`, `core-side-panel` | overlay, surface, shadow-lg |
| `core-autocomplete`, `core-multi-select` | surface, info-muted, text-muted |

Interactive reference: [doc/theming.html](./doc/theming.html).

## Kit development

- Edit defaults in `styles/tokens.css`.
- Map tokens to Tailwind in `tailwind.preset.js` (`var(--core-…)` only).
- Component CSS in `styles/core-ux.css` must use `core-*` utilities — **no** raw `gray-*`, `blue-*`, hex literals.
- Run `npm run build` after style changes.

## Adding tokens

1. Add default in `styles/tokens.css`.
2. Map in `tailwind.preset.js` if used via `@apply`.
3. Document here and in `doc/theming.html`.
4. Prefer semantic names (`--core-color-surface-hover`) over component-specific colour tokens.
