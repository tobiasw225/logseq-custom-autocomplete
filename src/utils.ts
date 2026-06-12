export interface Suggestion {
  text: string;
  type: "page" | "tag" | "dictionary";
  score: number;
  frequency?: number;
}

export function getWordBounds(
  content: string,
  cursorPos: number,
): { start: number; end: number; word: string; prefix: string } | null {
  if (!content || cursorPos < 0 || cursorPos > content.length) return null;

  const wordChars = /[a-zA-Z0-9_\-\p{L}]/u;

  let start = cursorPos;
  while (start > 0 && wordChars.test(content[start - 1])) start--;

  let end = cursorPos;
  while (end < content.length && wordChars.test(content[end])) end++;

  const word = content.slice(start, end);
  const prefix = content.slice(start, cursorPos);
  return { start, end, word, prefix };
}

export function getWordAtCursor(content: string, cursorPos: number, minLength = 1): string | null {
  const bounds = getWordBounds(content, cursorPos);
  if (!bounds || bounds.word.length < minLength) return null;
  return bounds.word;
}

export function matchScore(text: string, prefix: string): number {
  const lower = text.toLowerCase();
  const pre = prefix.toLowerCase();
  if (lower === pre) return 100;
  if (lower.startsWith(pre)) return 90 - (lower.length - pre.length) * 2;
  if (lower.includes(pre)) return 50;
  return 0;
}
