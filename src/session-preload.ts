import { splitWords } from "./word";
import type { WordEntries, WordStore } from "./word-store";

export const PRELOAD_QUERY = "[:find ?content :limit 2000 :where [?b :block/content ?content]]";

export type DatascriptQuery = (query: string) => Promise<Array<[string]> | null | undefined>;

export async function preloadWords(store: WordStore, query: DatascriptQuery): Promise<boolean> {
  let results: Array<[string]>;
  try {
    results = (await query(PRELOAD_QUERY)) ?? [];
  } catch {
    return false;
  }

  const pending = new Map<string, number>();
  for (const [content] of results) {
    for (const word of splitWords(content)) {
      if (word.length <= 3) continue;
      const lower = word.toLowerCase();
      if (store.has(lower) || pending.has(lower)) continue;
      pending.set(lower, 1);
    }
  }

  if (pending.size === 0) return false;

  const entries: WordEntries = Array.from(pending.entries());
  store.restore(entries);
  return true;
}
