import { splitWords } from "./word";

export type WordEntries = Array<[string, number]>;

export interface WordStore {
  learn(content: string, cursorWord: string | null): void;
  search(prefix: string): string[];
  frequency(word: string): number;
  has(word: string): boolean;
  snapshot(): WordEntries;
  restore(entries: WordEntries): void;
  clear(): void;
}

export function createWordStore(): WordStore {
  const words = new Map<string, number>();

  return {
    learn(content, cursorWord) {
      const skip = cursorWord?.toLowerCase() ?? null;
      for (const word of splitWords(content)) {
        const lower = word.toLowerCase();
        if (skip && lower === skip) continue;
        words.set(lower, (words.get(lower) ?? 0) + 1);
      }
    },

    search(prefix) {
      if (!prefix) return [];
      const lower = prefix.toLowerCase();
      const results: WordEntries = [];
      for (const [word, freq] of words) {
        if (word.startsWith(lower)) results.push([word, freq]);
      }
      results.sort((a, b) => b[1] - a[1]);
      return results.map(([word]) => word);
    },

    frequency(word) {
      return words.get(word.toLowerCase()) ?? 0;
    },

    has(word) {
      return words.has(word.toLowerCase());
    },

    snapshot() {
      return Array.from(words.entries());
    },

    restore(entries) {
      for (const [word, freq] of entries) {
        words.set(word, freq);
      }
    },

    clear() {
      words.clear();
    },
  };
}
