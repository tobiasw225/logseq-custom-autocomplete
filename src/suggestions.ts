import type { Suggestion } from "./utils"
import { matchScore } from "./utils"
import { searchWords } from "./dictionary"

export async function queryPages(prefix: string): Promise<Suggestion[]> {
  if (!prefix || prefix.length < 2) return []
  const lower = prefix.toLowerCase()
  const results: Array<[string]> =
    (await logseq.DB.datascriptQuery(
      `[:find ?name
        :in $ ?prefix
        :where
        [?p :block/name ?name]
        [(clojure.string/starts-with? ?name ?prefix)]]`,
      lower,
    )) ?? []
  return results.map(([name]) => ({
    text: name,
    type: "page" as const,
    score: matchScore(name, lower),
  }))
}

export async function queryTags(prefix: string): Promise<Suggestion[]> {
  if (!prefix || prefix.length < 2) return []
  const lower = prefix.toLowerCase()
  const results: Array<[string]> =
    (await logseq.DB.datascriptQuery(
      `[:find ?name
        :in $ ?prefix
        :where
        [?b :block/tags ?t]
        [?t :block/name ?name]
        [(clojure.string/starts-with? ?name ?prefix)]]`,
      lower,
    )) ?? []
  const seen = new Set<string>()
  return results
    .map(([name]) => name)
    .filter((name: string) => {
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
    .map((name: string) => ({
      text: name,
      type: "tag" as const,
      score: matchScore(name, lower),
    }))
}

export async function getSuggestions(prefix: string): Promise<Suggestion[]> {
  const [pages, tags, dictWords] = await Promise.all([
    queryPages(prefix),
    queryTags(prefix),
    Promise.resolve(searchWords(prefix)),
  ])

  const dict: Suggestion[] = dictWords.map((w) => ({
    text: w,
    type: "dictionary" as const,
    score: matchScore(w, prefix),
  }))

  const byKey = new Map<string, Suggestion>()
  const insert = (s: Suggestion) => {
    const key = s.text.toLowerCase()
    const existing = byKey.get(key)
    if (!existing || s.score > existing.score) {
      byKey.set(key, s)
    }
  }
  pages.forEach(insert)
  tags.forEach(insert)
  dict.forEach(insert)

  return Array.from(byKey.values()).sort((a, b) => b.score - a.score)
}
