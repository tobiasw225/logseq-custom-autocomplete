# Logseq Autocomplete

Suggests **pages**, **tags**, and **dictionary words** while you type in Logseq.

## Use Case

When you type plain text, a compact dropdown appears showing completion suffixes (the remaining part of the word). Each entry is shown as gray ghost text — just the suffix after what you've already typed. Pages and tags are labeled with a small `(p)` or `(t)`; dictionary words have no label. The dropdown shows up to 4 items and is positioned below the current block. Click a suggestion (or press `Alt+J`/`Alt+,` to navigate and `Tab` to confirm) to replace the partial word. When enabled, a single match can be inserted automatically.

### What changes?

| Scenario | Default Logseq (no plugin) | With this plugin |
|---|---|---|
| Typing `hel` in a block | No suggestion — you just see `hel` as plain text | A compact dropdown appears below the block showing completion suffixes (e.g., `lo (p)`, `p (t)`). The first entry is pre-selected. |
| Typing `[[hel` | Default page-ref autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `[[` autocomplete |
| Typing `#hel` | Default tag autocomplete kicks in (unchanged) | Plugin defers to Logseq's built-in `#` autocomplete |

The plugin queries three sources when you type a word (≥1 character):

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

### Suggestion Delay

The **Suggestion Delay (ms)** setting (default: 80) controls how long the plugin waits after the last keystroke before querying suggestions. Lower values feel more responsive; higher values reduce database queries during fast typing.

### Min Interval

The **Min Interval (ms)** setting (default: 80) sets the minimum time between consecutive suggestion queries. This prevents excessive queries when the block content changes rapidly.

### Auto-expand on unique match

When enabled (default: off), the plugin inserts the suggestion automatically when exactly one match is found. The configurable debounce ensures the user has paused typing before the expansion triggers. If the user continues typing during the asynchronous database query, the safety check catches it and shows the dropdown instead.

### Frequency Weights

Three per-type sliders (0–1) control how much usage frequency influences the ranking:

| Setting | Default | Effect |
|---------|---------|--------|
| **Page Freq. Weight** | 0.3 | How much page frequency matters vs. match quality |
| **Tag Freq. Weight** | 0.3 | How much tag frequency matters vs. match quality |
| **Dict Freq. Weight** | 0.3 | How much dictionary-word frequency matters vs. match quality |

A weight of `0` ignores frequency entirely (pure match score), while `1` sorts purely by how often you've typed the word. The default `0.3` gives a gentle boost to frequently used words without overpowering the prefix match.

### Context-Aware Filtering

When **Enable context-aware filtering** is on (default), the plugin suppresses suggestions in contexts where Logseq's own autocomplete or no completion is expected:

- Inside `[[wikilinks]]` — Logseq's built-in page-ref autocomplete takes over
- Inside `#tags` — Logseq's built-in tag autocomplete takes over
- Inside code blocks (`` ``` ``) — code should not trigger suggestions
- Inside URLs — URL text should not trigger suggestions

Disable the setting to show suggestions everywhere, including these contexts.

### Session Learning

The plugin automatically learns words while you type and remembers them across sessions (persisted in plugin settings). On first run, existing words from your graph are pre-loaded into the session dictionary, so suggestions appear right away. Session frequency boosts the ranking of pages, tags, and dictionary words via the per-type frequency weights above. No configuration needed — it works out of the box.
