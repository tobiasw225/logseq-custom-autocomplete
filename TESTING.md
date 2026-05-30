# Manual Test Checklist

Use this checklist to verify the plugin works correctly in Logseq Desktop.

## Prerequisites

1. Build the plugin: `npm run build`
2. Load the unpacked plugin in Logseq (see README.md)
3. Have a graph with at least a few pages and tags

## Tests

### Basic autocomplete (pages)

- [x] Open a block and start typing a page name (e.g., type `hel` if you have a page "Hello")
- [x] Expect: A dropdown appears with the matching page name
- [ ] Click the suggestion → the partial word is replaced with the full page name

### Tag suggestions

- [ ] Type a tag prefix (e.g., `prog` if you have `#programming` tags in your graph)
- [ ] Expect: Matching tags appear with a `#` badge

### Custom dictionary

- [ ] Go to plugin settings, set custom dictionary to `clojure,datascript,logseq`
- [ ] Type `clo` in a block
- [ ] Expect: "clojure" appears as a suggestion (with `D` badge)
- [ ] Click it → the word is inserted

### No suggestions

- [ ] Type `xyzzy` (a word that doesn't match anything)
- [ ] Expect: No dropdown appears
- [ ] Type a single character (e.g., `a`)
- [ ] Expect: No dropdown (min length is 2)

### Dismissal

- [ ] Type to trigger suggestions, then press `Escape`
- [ ] Expect: Dropdown disappears
- [ ] Type more characters → dropdown reappears with refined suggestions

### Keyboard navigation

- [ ] Type to trigger suggestions
- [ ] Press `Alt+J` → next item is highlighted
- [ ] Press `Alt+K` → previous item is highlighted
- [ ] Press `Ctrl+Shift+Space` → the highlighted item is inserted

### Edge cases

- [ ] Empty block: no dropdown
- [ ] Typing at the end of a block with existing content: dropdown appears
- [ ] Typing after punctuation: word correctly detected
- [ ] Navigating to another page: polling resets, no stale dropdown
