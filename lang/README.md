# CORE_UX reference labels

Optional label snippets for kit components. **Consuming apps** merge these into their label API (REST / JSON files) — CORE_UX does not load them at runtime.

| File | Locale |
|------|--------|
| `labels-en.json` | English |
| `labels-fr.json` | French |
| `labels-es.json` | Spanish |
| `labels-de.json` | German |

Each file exposes a `core_ux` container used by `core-rich-text` toolbar and link-dialog strings. Keys are documented in `components/core-rich-text/README.md`.
