# Glossary

## Word

A run of characters matching `[a-zA-Z0-9_\-\p{L}]`. The `word` module owns this definition: `isWordChar` tests a single character, `splitWords` extracts every word from text, and `getWordAtCursor` returns the word containing a cursor offset. Tokens keep their original casing; callers normalize to lowercase before storing.

## Word Store

The in-memory frequency map behind the session dictionary. `createWordStore()` returns a `WordStore` that learns words via `learn`, finds prefix matches via `search`, reports counts via `frequency`, and exposes its data through `snapshot`/`restore`. It never touches Logseq globals; persistence and preloading are separate modules.

## Session Persistence

The adapter that stores the word store as JSON in the `sessionDictionary` setting. `createSessionPersistence()` reads and writes through a `SessionSettingsPort` and debounces saves by 2000 ms; `dispose` cancels a pending save.

## Preload

A one-shot import of existing block content into the word store. `preloadWords()` receives a `DatascriptQuery` capability, keeps only words longer than three characters, and returns whether anything new was added so the caller can persist immediately.
