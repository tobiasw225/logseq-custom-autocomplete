# Logseq Autocomplete

Suggests **pages**, **tags**, and **custom dictionary words** while you type in Logseq.

## Use Case

A floating dropdown appears with ranked suggestions as you type plain text. Click a suggestion (or press `Alt+J`/`Alt+,` to navigate and `Tab` to confirm) to replace the partial word. When enabled, a single match can be inserted automatically.

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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+J` | Next suggestion |
| `Alt+,` | Previous suggestion |
| `Tab` | Confirm selected suggestion |
| `Escape` | Dismiss suggestion dropdown |

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

### Auto-expand on unique match

When enabled (default: off), the plugin inserts the suggestion automatically when exactly one match is found. The built-in 150ms debounce ensures the user has paused typing before the expansion triggers. If the user continues typing during the asynchronous database query, the safety check catches it and shows the dropdown instead.

### Frequency Weights

Three per-type sliders (0–1) control how much usage frequency influences the ranking:

| Setting | Default | Effect |
|---------|---------|--------|
| **Page Freq. Weight** | 0.3 | How much page frequency matters vs. match quality |
| **Tag Freq. Weight** | 0.3 | How much tag frequency matters vs. match quality |
| **Dict Freq. Weight** | 0.3 | How much dictionary-word frequency matters vs. match quality |

A weight of `0` ignores frequency entirely (pure match score), while `1` sorts purely by how often you've typed the word. The default `0.3` gives a gentle boost to frequently used words without overpowering the prefix match.

### Session Learning

The plugin automatically learns words while you type and remembers them across sessions (persisted in plugin settings). Session frequency boosts the ranking of pages, tags, and dictionary words via the per-type frequency weights above. No configuration needed — it works out of the box.

> The settings key in the Logseq settings DB is `customDictionary`. If you see a raw
> JSON editor instead of the form above, rebuild the plugin (`npm run build`) and
> reload it in Logseq.
