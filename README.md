# Logseq Autocomplete

Suggests **pages**, **tags**, and **custom dictionary words** while you type in Logseq.

## Use Case

A floating dropdown appears with ranked suggestions as you type plain text. Click a suggestion (or press `Alt+J`/`Alt+K` to navigate and `Ctrl+Shift+Space` to confirm) to replace the partial word.

### What changes?

| Scenario | Default Logseq (no plugin) | With this plugin |
|---|---|---|
| Typing `hel` in a block | No suggestion — you just see `hel` as plain text | A dropdown appears showing matching page names (e.g., "Hello"), tags, and dictionary words |
| Typing `dat` in a block | No suggestion | If "datascript" is in your custom dictionary, it appears as a suggestion |
| Typing `[[hel` | Default page-ref autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `[[` autocomplete (no change) |
| Typing `#hel` | Default tag autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `#` autocomplete (no change) |
| Custom word list | Not available | You can add a comma-separated dictionary in plugin settings and those words will autocomplete as you type |

The plugin queries three sources when you type a word (≥2 characters):

- **Pages** — page titles from your graph that match the prefix
- **Tags** — tags used in your graph that match the prefix (detected via both `#tag` inline references and `tags::` properties)
- **Dictionary** — words from a custom comma-separated list (configurable in plugin settings)

When a name matches both a page and a tag, only the tag entry is shown (tags take priority over pages in the suggestion list).

## Setup

### Prerequisites

- [Logseq Desktop](https://logseq.com) (plugin system requires the desktop app)
- Node.js 18+ and npm

### Install & Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Or watch for changes during development
npm run dev
```

### Load in Logseq

1. Open Logseq → `Settings` → `Advanced` → enable **Developer Mode**
2. Click `...` → `Plugins` → `Load unpacked plugin`
3. Select the `logseq-autocomplete` folder
4. The plugin activates automatically

## Configuration

Go to the plugin settings in Logseq (`...` → `Plugins` → click the gear icon on "Autocomplete").

**Custom Dictionary**: A comma-separated list of words. Example:

```
clojure,datascript,logseq,autocomplete
```

These words will appear as suggestions when you type a matching prefix.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+J` | Next suggestion |
| `Alt+K` | Previous suggestion |
| `Ctrl+Shift+Space` | Confirm selected suggestion |
| `Escape` | Dismiss suggestion dropdown |

## How It Works

1. A polling loop (300ms interval) checks the currently-edited block via `logseq.Editor.getCurrentBlock()`
2. When content changes, it extracts the word being typed (everything from the last word boundary to the cursor)
3. Three sources are queried in parallel:
   - **Datalog query** for pages matching the prefix (`:block/name`)
   - **Datalog query** for tags (`:block/tags` and `:block/refs`) — catches both inline `#tag` references and `tags::` properties
   - **In-memory search** of the custom dictionary
4. Results are merged: if a name matches both a page and a tag, the page entry is dropped (tags take priority over pages)
5. Results are ranked by match score, with tags appearing before pages before dictionary words when scores are equal
5. A floating dropdown is rendered via `logseq.provideUI`
6. On selection, `logseq.Editor.updateBlock` replaces the partial word

## Project Structure

```
logseq-autocomplete/
├── package.json          # Plugin manifest + settings schema
├── index.html            # Entry point
├── vite.config.ts        # Vite bundler config
├── vitest.config.ts      # Test config
├── tsconfig.json
└── src/
    ├── main.ts           # Lifecycle, polling loop, wiring
    ├── utils.ts          # Word detection, text parsing, scoring
    ├── dictionary.ts     # Custom dictionary CRUD
    ├── suggestions.ts    # DB queries for pages/tags
    ├── ui.ts             # Floating dropdown UI
    ├── utils.test.ts     # Unit tests
    ├── dictionary.test.ts
    └── suggestions.test.ts
```

## License

MIT
