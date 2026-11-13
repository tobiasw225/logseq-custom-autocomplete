export interface Suggestion {
  text: string;
  type: "dictionary";
  score: number;
  frequency?: number;
}

export function longestCommonPrefix(suggestions: Suggestion[], typedWord: string): string | null {
  const lowerTyped = typedWord.toLowerCase();
  const texts = suggestions.map((s) => s.text.toLowerCase()).filter((t) => t.startsWith(lowerTyped));
  if (texts.length === 0) return null;

  let lcp = texts[0];
  for (const t of texts.slice(1)) {
    while (!t.startsWith(lcp)) lcp = lcp.slice(0, -1);
    if (!lcp) return null;
  }

  if (lcp.length <= lowerTyped.length) return null;

  return typedWord + lcp.slice(lowerTyped.length);
}

export function matchScore(text: string, prefix: string): number {
  const lower = text.toLowerCase();
  const pre = prefix.toLowerCase();
  if (lower === pre) return 100;
  if (lower.startsWith(pre)) return 90 - (lower.length - pre.length) * 2;
  if (lower.includes(pre)) return 50;
  return 0;
}
