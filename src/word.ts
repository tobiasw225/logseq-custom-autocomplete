const WORD_CHAR = /[a-zA-Z0-9_\-\p{L}]/u;
const WORD_SEQUENCE = /[a-zA-Z0-9_\-\p{L}]+/gu;

export function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD_CHAR.test(char);
}

export function splitWords(content: string): string[] {
  return content.match(WORD_SEQUENCE) ?? [];
}

export function getWordAtCursor(content: string, cursorPos: number, minLength = 1): string | null {
  if (!content || cursorPos < 0 || cursorPos > content.length) return null;

  let start = cursorPos;
  while (start > 0 && isWordChar(content[start - 1])) start--;

  let end = cursorPos;
  while (end < content.length && isWordChar(content[end])) end++;

  const word = content.slice(start, end);
  if (word.length < minLength) return null;
  return word;
}
