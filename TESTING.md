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
- [x] Click the suggestion → the partial word is replaced with the full page name 
   -> clicking does not work, only keyboard support, OK

### Tag suggestions

- [x] Type a tag prefix (e.g., `prog` if you have `#programming` tags in your graph)
- [x] Expect: Matching tags appear with a `#` badge

### Custom dictionary

- [ ] Go to plugin settings, set custom dictionary to `clojure,datascript,logseq`
- [ ] Type `clo` in a block
- [ ] Expect: "clojure" appears as a suggestion (with `D` badge)
- [ ] Click it → the word is inserted

### No suggestions

- [x] Type `xyzzy` (a word that doesn't match anything)
- [x] Expect: No dropdown appears
- [x] Type a single character (e.g., `a`)
- [x] Expect: No dropdown (min length is 2)

### Dismissal

- [x] Type to trigger suggestions, then press `Escape`
- [x] Expect: Dropdown disappears
- [x] Type more characters → dropdown reappears with refined suggestions

### Keyboard navigation

- [x] Type to trigger suggestions
- [x] Press `Alt+J` → next item is highlighted
- [x] Press `Alt+K` → previous item is highlighted
- [x] Press `Ctrl+Space` → the highlighted item is inserted

### Edge cases

- [x] Empty block: no dropdown
- [x] Typing at the end of a block with existing content: dropdown appears
- [x] Typing after punctuation: word correctly detected
- [x] Navigating to another page: polling resets, no stale dropdown
