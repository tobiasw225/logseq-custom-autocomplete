# Logseq Autocomplete

Suggests **pages**, **tags**, and **dictionary words** while you type in Logseq.

## Use Case

A floating dropdown appears with ranked suggestions as you type plain text. Click a suggestion (or press `Alt+J`/`Alt+,` to navigate and `Tab` to confirm) to replace the partial word. When enabled, a single match can be inserted automatically.

### What changes?

| Scenario | Default Logseq (no plugin) | With this plugin |
|---|---|---|
| Typing `hel` in a block | No suggestion — you just see `hel` as plain text | A dropdown appears showing matching page names (e.g., "Hello"), tags, and dictionary words |
| Typing `[[hel` | Default page-ref autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `[[` autocomplete (no change) |
| Typing `#hel` | Default tag autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `#` autocomplete (no change) |

The plugin queries three sources when you type a word (≥2 characters):

- **Pages** — page titles from your graph that match the prefix
- **Tags** — tags used in your graph that match the prefix (detected via both `#tag` inline references and `tags::` properties)
- **Session** — words you have typed in this and earlier sessions, automatically learned and ranked by frequency. On first run, existing words from your blocks are pre-loaded so suggestions are available immediately.

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

The plugin automatically learns words while you type and remembers them across sessions (persisted in plugin settings). On first run, existing words from your graph are pre-loaded into the session dictionary, so suggestions appear right away. Session frequency boosts the ranking of pages, tags, and dictionary words via the per-type frequency weights above. No configuration needed — it works out of the box.
