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
2. Before extracting the word, the plugin checks whether the cursor is in an ignored context ([[wikilink]], #tag, code block, URL) via `src/context.ts`. If so, suggestions are suppressed
3. When content changes, it extracts the word being typed (everything from the last word boundary to the cursor)
3. The block content is automatically learned and added to a **session dictionary** with frequency tracking, persisted across restarts
4. Four sources are queried in parallel:
   - **Datalog query** for pages matching the prefix (`:block/name`)
   - **Datalog query** for tags (`:block/tags` and `:block/refs`) — catches both inline `#tag` references and `tags::` properties
   - **Session dictionary** — words learned from your typing, ranked by frequency
5. Results are merged: if a name matches both a page and a tag, the page entry is dropped (tags take priority over pages)
6. Results are ranked by a blended score: `matchScore * (1 - weight) + frequencyScore * weight`, where `weight` is configurable per type (page/tag/dictionary). Frequency is normalized across the result set (highest frequency = 100). Ties fall back to type order (dictionary → tag → page) for deterministic sorting
7. A floating dropdown is rendered via `logseq.provideUI` (key `ac-dropdown`)
8. If **inline preview** is enabled (`enableInlinePreview` setting), the best suggestion is shown as gray ghost text directly after the cursor using a CSS `::after` pseudo-element on the current block (`.block-content[data-uuid="..."]::after`). A `<style id="ac-ghost-style">` element is injected into `<head>` with the ghost suffix as CSS `content`, and removed on dismissal. This renders the ghost as part of the block's content flow without touching the DOM or using `logseq.Editor.updateBlock`
9. On selection, `logseq.Editor.updateBlock` replaces the partial word

## License

MIT
