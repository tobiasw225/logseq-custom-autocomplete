# Logseq Autocomplete

Suggests **pages**, **tags**, and **custom dictionary words** while you type in Logseq.

## Use Case

A floating dropdown appears with ranked suggestions as you type plain text. Click a suggestion (or press `Alt+J`/`Alt+K` to navigate and `Ctrl+Space` to confirm) to replace the partial word.

### What changes?

| Scenario | Default Logseq (no plugin) | With this plugin |
|---|---|---|
| Typing `hel` in a block | No suggestion — you just see `hel` as plain text | A dropdown appears showing matching page names (e.g., "Hello"), tags, and dictionary words |
| Typing `dat` in a block | No suggestion | If "datascript" is in your custom dictionary, it appears as a suggestion |
| Typing `[[hel` | Default page-ref autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `[[` autocomplete (no change) |
| Typing `#hel` | Default tag autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `#` autocomplete (no change) |
| Custom word list | Not available | You can add a comma-separated dictionary in plugin settings and those words will autocomplete as you type |

The plugin queries four sources when you type a word (≥2 characters):

- **Pages** — page titles from your graph that match the prefix
- **Tags** — tags used in your graph that match the prefix (detected via both `#tag` inline references and `tags::` properties)
- **Dictionary** — words from a custom comma-separated list (configurable in plugin settings)
- **Session** — words you have typed in this and earlier sessions, automatically learned and ranked by frequency

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

1. In Logseq, click `...` (more) → `Plugins`
2. Find **Autocomplete** in the plugin list
3. Click the gear icon (⚙) on the right to open settings

### Manual Dictionary

The **Custom Dictionary** field lets you enter a comma-separated list, e.g.:
```
clojure,datascript,logseq,autocomplete
```
These words will appear as suggestions when you type a matching prefix.

### Auto-generate Dictionary

Turn on **Auto-generate Dictionary** to automatically collect words from your recent blocks.
When enabled, the plugin scans your most recently edited blocks at startup and adds words
longer than 3 characters to the suggestion pool. These words are merged with (not replacing)
your manual dictionary.

**Max Auto-Dictionary Words** controls how many words are collected (default: 200). This
ensures fast loading (< 100ms) while providing a rich set of suggestions.

### Session Learning

The plugin automatically learns words while you type and remembers them across sessions (persisted in plugin settings). Frequently used words rank higher in suggestions. No configuration needed — it works out of the box.

> The settings key in the Logseq settings DB is `customDictionary`. If you see a raw
> JSON editor instead of the form above, rebuild the plugin (`npm run build`) and
> reload it in Logseq.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+J` | Next suggestion |
| `Alt+K` | Previous suggestion |
| `Ctrl+Space` | Confirm selected suggestion |
| `Escape` | Dismiss suggestion dropdown |

## How It Works

1. A polling loop (300ms interval) checks the currently-edited block via `logseq.Editor.getCurrentBlock()`
2. When content changes, it extracts the word being typed (everything from the last word boundary to the cursor)
3. The block content is automatically learned and added to a **session dictionary** with frequency tracking, persisted across restarts
4. Four sources are queried in parallel:
   - **Datalog query** for pages matching the prefix (`:block/name`)
   - **Datalog query** for tags (`:block/tags` and `:block/refs`) — catches both inline `#tag` references and `tags::` properties
   - **In-memory search** of the custom dictionary (manual + auto-generated, if enabled)
   - **Session dictionary** — words learned from your typing, ranked by frequency
5. Results are merged: if a name matches both a page and a tag, the page entry is dropped (tags take priority over pages)
6. Results are ranked by match score, with dictionary (including session words) appearing before tags before pages when scores are equal
7. A floating dropdown is rendered via `logseq.provideUI`
8. On selection, `logseq.Editor.updateBlock` replaces the partial word


## License

MIT
