import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

const DICT_KEY = "customDictionary";
const AUTO_ENABLED_KEY = "autoDictionaryEnabled";
const AUTO_MAX_KEY = "autoDictionaryMaxWords";

let autoWords: string[] = [];
let autoWordsLoaded = false;

export function settingsSchema(): SettingSchemaDesc[] {
  return [
    {
      key: DICT_KEY,
      type: "string",
      default: "",
      title: "Custom Dictionary",
      description:
        "Comma-separated list of words to include in autocomplete suggestions. Example: `clojure,datascript,logseq`",
      inputAs: "textarea",
    },
    {
      key: AUTO_ENABLED_KEY,
      type: "boolean",
      default: false,
      title: "Auto-generate Dictionary",
      description:
        "When enabled, the last N words from your recent blocks are automatically added to the suggestion pool. Words longer than 3 characters are collected. Combines with the manual Custom Dictionary above.",
    },
    {
      key: AUTO_MAX_KEY,
      type: "number",
      default: 200,
      title: "Max Auto-Dictionary Words",
      description: "Maximum number of words to collect from block history when auto-generate is enabled.",
    },
    {
      key: "frequencyWeightPage",
      type: "number",
      default: 0.3,
      title: "Page Freq. Weight",
      description: "How much page usage frequency matters in ranking (0–1). 0 = match score only, 1 = frequency only.",
      inputAs: "range",
    },
    {
      key: "frequencyWeightTag",
      type: "number",
      default: 0.3,
      title: "Tag Freq. Weight",
      description: "How much tag usage frequency matters in ranking (0–1). 0 = match score only, 1 = frequency only.",
      inputAs: "range",
    },
    {
      key: "frequencyWeightDict",
      type: "number",
      default: 0.3,
      title: "Dict Freq. Weight",
      description:
        "How much dictionary-word usage frequency matters in ranking (0–1). 0 = match score only, 1 = frequency only.",
      inputAs: "range",
    },
  ];
}

export function loadWords(): string[] {
  const raw = logseq.settings?.[DICT_KEY];
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((w: string) => w.trim())
    .filter(Boolean);
}

export async function loadAutoWords(): Promise<string[]> {
  autoWordsLoaded = false;
  autoWords = [];

  const enabled = !!(logseq.settings as Record<string, unknown>)?.[AUTO_ENABLED_KEY];
  if (!enabled) {
    autoWordsLoaded = true;
    return [];
  }

  let results: Array<[string]> = [];
  try {
    results =
      (await logseq.DB.datascriptQuery("[:find ?content :limit 2000 :where [?b :block/content ?content]]")) ?? [];
  } catch (err) {
    console.error("[ac] auto-dictionary query failed:", err);
    autoWordsLoaded = true;
    return [];
  }

  const seen = new Set<string>();
  const wordPattern = /[a-zA-Z0-9_\-\p{L}]+/gu;

  for (const [content] of results) {
    const matches = content.match(wordPattern);
    if (!matches) continue;
    for (const w of matches) {
      if (w.length > 3) {
        seen.add(w.toLowerCase());
      }
    }
  }

  autoWords = Array.from(seen);
  autoWordsLoaded = true;
  console.log(`[ac] auto-dictionary: loaded ${autoWords.length} words from ${results.length} blocks`);
  return autoWords;
}

function getAllWords(): string[] {
  const manual = loadWords();
  if (!autoWordsLoaded || autoWords.length === 0) return manual;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of [...manual, ...autoWords]) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(w);
    }
  }
  return result;
}

export async function addWord(word: string): Promise<void> {
  const words = loadWords();
  const normal = word.trim().toLowerCase();
  if (!normal || words.some((w) => w.toLowerCase() === normal)) return;
  words.push(word.trim());
  await logseq.updateSettings({ [DICT_KEY]: words.join(", ") });
}

export async function removeWord(word: string): Promise<void> {
  const words = loadWords();
  const normal = word.trim().toLowerCase();
  const filtered = words.filter((w) => w.toLowerCase() !== normal);
  await logseq.updateSettings({ [DICT_KEY]: filtered.join(", ") });
}

export function searchWords(prefix: string): string[] {
  if (!prefix || prefix.length < 2) return [];
  const lower = prefix.toLowerCase();
  return getAllWords().filter((w) => w.toLowerCase().startsWith(lower));
}

export function getAutoWords(): string[] {
  return autoWords;
}

export function getAutoWordsLoaded(): boolean {
  return autoWordsLoaded;
}

export function resetAutoWords(): void {
  autoWords = [];
  autoWordsLoaded = false;
}
