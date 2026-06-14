# Development

## Prerequisites

- [Logseq Desktop](https://logseq.com) (plugin system requires the desktop app)
- Node.js 18+ and npm

## Install & Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Or watch for changes during development
npm run dev
```

## Load in Logseq

1. Open Logseq → `Settings` → `Advanced` → enable **Developer Mode**
2. Click `...` → `Plugins` → `Load unpacked plugin`
3. Select the `logseq-autocomplete` folder
4. The plugin activates automatically

## How It Works

1. A debounced callback (configurable via `suggestionDebounceDelay`, default 80ms) fires after the last keystroke to query suggestions
2. Before extracting the word, the plugin checks whether the cursor is in an ignored context (code block or URL) via `src/context.ts`. If so, suggestions are suppressed
3. When content changes, it extracts the word being typed (everything from the last word boundary to the cursor)
4. The block content is automatically learned and added to a **session dictionary** with frequency tracking, persisted across restarts
5. The session dictionary is queried synchronously for prefix matches, sorted by frequency descending
6. Results are ranked by a blended score: `matchScore * (1 - weight) + frequencyScore * weight`, where `weight` is configurable. Frequency is normalized across the result set (highest frequency = 100)
7. A floating dropdown is rendered via `logseq.provideUI` (key `ac-dropdown`). The dropdown shows completion suffixes (text after the typed prefix) in ghost-like opacity. The list is capped at 4 items; if more exist, a `…` indicator is shown
8. The dropdown container's drag/resize handles are hidden and pointer events are adjusted. The editor retains focus so the user can continue typing. Navigating the list is handled via Logseq command shortcuts (`Alt+J`/`Alt+,`)
9. Confirming is done via `Ctrl+Space` (a Logseq command shortcut) — no DOM focus shifting is needed. When multiple suggestions are visible, `longestCommonPrefix` computes the longest shared prefix across all suggestions; only that prefix is inserted as plain text. When exactly one suggestion exists, it is inserted in full
10. On confirmation, `logseq.Editor.updateBlock` replaces the partial word with the completed text. The previously focused editor element is restored after the container is removed

## License

MIT
