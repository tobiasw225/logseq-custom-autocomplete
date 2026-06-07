export interface Suggestion {
  text: string;
  type: "page" | "tag" | "dictionary";
  score: number;
  frequency?: number;
}

export function getWordAtCursor(content: string, cursorPos: number, minLength = 2): string | null {
  if (!content || cursorPos < 0 || cursorPos > content.length) return null;

  const wordChars = /[a-zA-Z0-9_\-\p{L}]/u;

  // walk backward from cursor to find word start
  let start = cursorPos;
  while (start > 0 && wordChars.test(content[start - 1])) start--;

  // walk forward to find word end (cursorPos may not be at the end)
  let end = cursorPos;
  while (end < content.length && wordChars.test(content[end])) end++;

  const word = content.slice(start, end);
  if (word.length < minLength) return null;
  return word || null;
}

export function matchScore(text: string, prefix: string): number {
  const lower = text.toLowerCase();
  const pre = prefix.toLowerCase();
  if (lower === pre) return 100;
  if (lower.startsWith(pre)) return 90 - (lower.length - pre.length) * 2;
  if (lower.includes(pre)) return 50;
  return 0;
}
