import { getSessionFrequency, searchSessionWords } from "./session";
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
    frequency: 0,
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
    frequency: 0,
  }));
}

export async function getSuggestions(prefix: string): Promise<Suggestion[]> {
  const [pages, tags, sessionWords] = await Promise.all([
    queryPages(prefix),
    queryTags(prefix),
    Promise.resolve(searchSessionWords(prefix)),
  ]);

  const mergedDict: Suggestion[] = sessionWords.map((w) => ({
    text: w,
    type: "dictionary" as const,
    score: matchScore(w, prefix),
    frequency: 0,
  }));

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

  for (const s of deduped) {
    s.frequency = getSessionFrequency(s.text);
  }

  const weights: Record<string, number> = {
    page: Number((logseq.settings as Record<string, unknown>)?.frequencyWeightPage ?? 0.3),
    tag: Number((logseq.settings as Record<string, unknown>)?.frequencyWeightTag ?? 0.3),
    dictionary: Number((logseq.settings as Record<string, unknown>)?.frequencyWeightDict ?? 0.3),
  };

  const maxFreq = deduped.reduce((max, s) => Math.max(max, s.frequency ?? 0), 0);
  const typeOrder = { tag: 1, page: 2, dictionary: 0 };

  return deduped.sort((a, b) => {
    const normA = maxFreq > 0 ? ((a.frequency ?? 0) / maxFreq) * 100 : 0;
    const normB = maxFreq > 0 ? ((b.frequency ?? 0) / maxFreq) * 100 : 0;
    const finalA = a.score * (1 - weights[a.type]) + normA * weights[a.type];
    const finalB = b.score * (1 - weights[b.type]) + normB * weights[b.type];
    if (finalA !== finalB) return finalB - finalA;
    return typeOrder[a.type] - typeOrder[b.type];
  });
}
