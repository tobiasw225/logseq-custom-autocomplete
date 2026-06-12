import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

const DICT_KEY = "customDictionary";

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
      key: "autoExpandOnUnique",
      type: "boolean",
      default: false,
      title: "Auto-expand on unique match",
      description: "When enabled and only one suggestion exists, it is inserted automatically.",
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

function getAllWords(): string[] {
  return loadWords();
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
