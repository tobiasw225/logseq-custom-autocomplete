import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin"

const DICT_KEY = "customDictionary"

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
  ]
}

export function loadWords(): string[] {
  const raw = logseq.settings?.[DICT_KEY]
  if (!raw || typeof raw !== "string") return []
  return raw
    .split(",")
    .map((w: string) => w.trim())
    .filter(Boolean)
}

export async function addWord(word: string): Promise<void> {
  const words = loadWords()
  const normal = word.trim().toLowerCase()
  if (!normal || words.some((w) => w.toLowerCase() === normal)) return
  words.push(word.trim())
  await logseq.updateSettings({ [DICT_KEY]: words.join(", ") })
}

export async function removeWord(word: string): Promise<void> {
  const words = loadWords()
  const normal = word.trim().toLowerCase()
  const filtered = words.filter((w) => w.toLowerCase() !== normal)
  await logseq.updateSettings({ [DICT_KEY]: filtered.join(", ") })
}

export function searchWords(prefix: string): string[] {
  if (!prefix || prefix.length < 2) return []
  const lower = prefix.toLowerCase()
  return loadWords().filter((w) => w.toLowerCase().startsWith(lower))
}
