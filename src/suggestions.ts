import { getSessionFrequency, searchSessionWords } from "./session";
import type { Suggestion } from "./utils";
import { matchScore } from "./utils";

export function getSuggestions(prefix: string): Suggestion[] {
  const words = searchSessionWords(prefix);

  const suggestions: Suggestion[] = words.map((w) => ({
    text: w,
    type: "dictionary" as const,
    score: matchScore(w, prefix),
  }));

  const weight = Number((logseq.settings as Record<string, unknown>)?.frequencyWeightDict ?? 0.3);
  const maxFreq = words.length > 0 ? Math.max(...words.map((w) => getSessionFrequency(w))) : 0;

  return suggestions.sort((a, b) => {
    const freqA = getSessionFrequency(a.text);
    const freqB = getSessionFrequency(b.text);
    const normA = maxFreq > 0 ? (freqA / maxFreq) * 100 : 0;
    const normB = maxFreq > 0 ? (freqB / maxFreq) * 100 : 0;
    const finalA = a.score * (1 - weight) + normA * weight;
    const finalB = b.score * (1 - weight) + normB * weight;
    return finalB - finalA;
  });
}
