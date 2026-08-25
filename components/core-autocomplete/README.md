# Autocomplete (CORE_UX)

Vanilla DOM autocomplete — no Semantic UI, no Handlebars.

## Tags

| Tag | Role |
|-----|------|
| `<core-autocomplete>` | Single-value combobox |
| `<core-autocomplete-chips>` | Multi-select with removable chips |

## Basic usage

```html
<core-autocomplete
  label="User"
  placeholder="Search…"
  min-characters="2"
  clearable
></core-autocomplete>
```

```javascript
const el = document.querySelector('core-autocomplete');
el.setDataSource([
  { title: 'Alice', value: 1 },
  { title: 'Bob', value: 2 }
]);
el.addEventListener('autocomplete-select', (e) => {
  console.log(e.detail.result);
});
```

## Async / Observable data source

```javascript
el.setDataSource((query) =>
  $svc('ajax').callAPI('users/search', { q: query }).pipe(
    map((resp) => resp.data?.items ?? [])
  )
);
```

Only the latest search can update the choices. A newer query unsubscribes the
previous Observable when possible; late Promise resolutions and Observable
emissions are ignored. Existing choices are hidden as soon as the query changes;
queries below `min-characters` stay empty.

## Chips

```html
<core-autocomplete-chips
  label="Tags"
  max-chips="5"
  chips-position="above"
  unique
></core-autocomplete-chips>
```

Events: `chips-change`, `chips-add`, `chips-remove`.

## Extending (app-specific autocompletes)

```javascript
import { CoreAutocomplete } from 'CORE_UX/components/core-autocomplete/core-autocomplete.js';

export class TeamAutocomplete extends CoreAutocomplete {
  onConnect() {
    this.preConfigure({ minCharacters: 2 });
    super.onConnect();
    this.setDataSource(/* … */);
  }
}
customElements.define('team-autocomplete', TeamAutocomplete);
```

## Attributes

| Attribute | Default | Notes |
|-----------|---------|-------|
| `placeholder` | Type to search… | |
| `label` | — | Visible label |
| `min-characters` | 3 | Min query length |
| `delay` | 300 | Debounce ms |
| `max-results` | 10 | |
| `allow-additions` | false | Enter / click to add free text |
| `force-selection` | false | Revert blur if not from list |
| `clearable` | false | Show clear button |
| `no-results` | No results | Empty state text |
| `placeholder-container` / `placeholder-key` | — | i18n via `$svc('lang')` |
| `label-container` / `label-key` | — | i18n |
| `no-results-container` / `no-results-key` | — | i18n |

Chips-only: `item-label-key`, `item-value-key`, `clear-on-select`, `max-chips`, `unique`, `chips-position` (`above` \| `below`).

## Events

`autocomplete-select`, `autocomplete-search`, `autocomplete-results`, `autocomplete-open`, `autocomplete-close`, `autocomplete-focus`, `autocomplete-blur`, `autocomplete-change`

## Migration from CORE_JS `ui-autocomplete`

| Old | New |
|-----|-----|
| `<ui-autocomplete>` | `<core-autocomplete>` |
| `<ui-autocomplete-chips>` | `<core-autocomplete-chips>` |
| `CORE_JS/.../autocomplete-component.js` | `CORE_UX/components/core-autocomplete/core-autocomplete.js` |
| `AutocompleteComponent` | `CoreAutocomplete` (alias kept) |
| jQuery / Semantic `.search()` | native list + keyboard nav |

Import in app entry: `core-ux-myjourney.js` or `CORE_UX/index.js`.
