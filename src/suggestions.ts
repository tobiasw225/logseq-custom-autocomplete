import { searchWords } from "./dictionary";
import { searchSessionWords } from "./session";
import type { Suggestion } from "./utils";
import { matchScore } from "./utils";

export async function queryPages(prefix: string): Promise<Suggestion[]> {
  if (!prefix || prefix.length < 2) return [];
  const lower = prefix.toLowerCase();
  const results: Array<[string]> =
    (await logseq.DB.datascriptQuery(
      `[:find ?name
        :in $ ?prefix
        :where
        [?p :block/name ?name]
        [(clojure.string/starts-with? ?name ?prefix)]]`,
      lower,
    )) ?? [];
  return results.map(([name]) => ({
    text: name,
    type: "page" as const,
    score: matchScore(name, lower),
  }));
}

export async function queryTags(prefix: string): Promise<Suggestion[]> {
  if (!prefix || prefix.length < 2) return [];
  const lower = prefix.toLowerCase();
  const results: Array<[string]> =
    (await logseq.DB.datascriptQuery(
      `[:find ?name
        :in $ ?prefix
        :where
        [?t :block/name ?name]
        [(clojure.string/starts-with? ?name ?prefix)]
        (or
          [?b :block/tags ?t]
          [?b :block/refs ?t])]`,
      lower,
    )) ?? [];
  return results.map(([name]) => ({
    text: name,
    type: "tag" as const,
    score: matchScore(name, lower),
  }));
}

export async function getSuggestions(prefix: string): Promise<Suggestion[]> {
  const [pages, tags, dictWords, sessionWords] = await Promise.all([
    queryPages(prefix),
    queryTags(prefix),
    Promise.resolve(searchWords(prefix)),
    Promise.resolve(searchSessionWords(prefix)),
  ]);

  const sessionMapped = sessionWords.map((w) => ({
    text: w,
    type: "dictionary" as const,
    score: matchScore(w, prefix),
  }));

  const dict: Suggestion[] = dictWords.map((w) => ({
    text: w,
    type: "dictionary" as const,
    score: matchScore(w, prefix),
  }));

  const mergedDict = [...dict, ...sessionMapped];

  const tagNames = new Set(tags.map((t) => t.text.toLowerCase()));
  const filteredPages = pages.filter((p) => !tagNames.has(p.text.toLowerCase()));

  const seen = new Set<string>();
  const all = [...tags, ...filteredPages, ...mergedDict];
  const deduped = all.filter((s) => {
    const key = `${s.text.toLowerCase()}:${s.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const typeOrder = { tag: 1, page: 2, dictionary: 0 };
  return deduped.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return typeOrder[a.type] - typeOrder[b.type];
  });
}
