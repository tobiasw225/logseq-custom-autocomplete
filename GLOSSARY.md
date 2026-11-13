# Glossary

## Word

A run of characters matching `[a-zA-Z0-9_\-\p{L}]`. The `word` module owns this definition: `isWordChar` tests a single character, `splitWords` extracts every word from text, and `getWordAtCursor` returns the word containing a cursor offset. Tokens keep their original casing; callers normalize to lowercase before storing.
