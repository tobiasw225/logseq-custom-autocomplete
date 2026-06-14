# Logseq Autocomplete

Suggests **dictionary words** while you type in Logseq.

## Use Case

When you type plain text, a compact dropdown appears showing completion suffixes (the remaining part of the word). Each entry is shown as gray ghost text — just the suffix after what you've already typed. The dropdown shows up to 4 items and is positioned below the block. Press `Ctrl+Space` to complete up to the longest common prefix of all suggestions. When only one suggestion exists, it is inserted fully. Use `Alt+J`/`Alt+,` to navigate the list, then `Ctrl+Space` to confirm the selection. When enabled, a single match can be inserted automatically.

### What changes?

| Scenario | Default Logseq (no plugin) | With this plugin |
|---|---|---|
| Typing `hel` in a block | No suggestion — you just see `hel` as plain text | A compact dropdown appears below the block showing completion suffixes (e.g., `lo`). The first entry is pre-selected. |

The plugin queries one source when you type a word (≥1 character):

- **Session** — words you have typed in this and earlier sessions, automatically learned and ranked by frequency. On first run, existing words from your blocks are pre-loaded so suggestions are available immediately.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+J` | Next suggestion |
| `Alt+,` | Previous suggestion |
| `Ctrl+Space` | Complete to common prefix (multiple suggestions) or confirm full suggestion (single match) |
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

When enabled (default: off), the plugin inserts the suggestion automatically when exactly one match is found. The configurable debounce ensures the user has paused typing before the expansion triggers. If the user continues typing during the query, the safety check catches it and shows the dropdown instead.

### Frequency Weight

A slider (0–1) controls how much usage frequency influences the ranking. A weight of `0` ignores frequency entirely (pure match score), while `1` sorts purely by how often you've typed the word. The default `0.3` gives a gentle boost to frequently used words without overpowering the prefix match.

### Context-Aware Filtering

When **Enable context-aware filtering** is on (default), the plugin suppresses suggestions inside code blocks and URLs — contexts where completion is not expected.

### Partial Completion (Common Prefix)

`Ctrl+Space` inserts only the longest text that all suggestions share — the common prefix — rather than a full suggestion. This lets you iteratively narrow down:

1. Type `blau` → suggestions appear: `blaupause`, `blauwal`, `blau`
2. Press `Ctrl+Space` → inserts `blau` (the common prefix; no change since it matches what you typed)
3. Type `w` → now only `blauwal` matches
4. Press `Ctrl+Space` → inserts `blauwal` (single suggestion → full completion)

When only one suggestion remains, it is inserted in full.

### Session Learning

The plugin automatically learns words while you type and remembers them across sessions (persisted in plugin settings). On first run, existing words from your graph are pre-loaded into the session dictionary, so suggestions appear right away. No configuration needed — it works out of the box.
