const SESSION_KEY = "sessionDictionary";

const sessionWords = new Map<string, number>();

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function learnFromBlockContent(content: string, cursorWord: string | null): void {
  const words = content.match(/[a-zA-Z0-9_\-\p{L}]+/gu) ?? [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (cursorWord && lower === cursorWord.toLowerCase()) continue;
    sessionWords.set(lower, (sessionWords.get(lower) ?? 0) + 1);
  }
  schedulePersist();
}

export function searchSessionWords(prefix: string): string[] {
  if (!prefix || prefix.length < 2) return [];
  const lower = prefix.toLowerCase();
  const results: Array<[string, number]> = [];
  for (const [word, freq] of sessionWords) {
    if (word.startsWith(lower)) results.push([word, freq]);
  }
  results.sort((a, b) => b[1] - a[1]);
  return results.map(([w]) => w);
}

export function getSessionFrequency(word: string): number {
  return sessionWords.get(word.toLowerCase()) ?? 0;
}

export function resetSessionWords(): void {
  sessionWords.clear();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

export function loadSessionWords(): void {
  try {
    const raw = (logseq.settings as Record<string, unknown>)?.[SESSION_KEY];
    if (!raw || typeof raw !== "string") return;
    const entries: Array<[string, number]> = JSON.parse(raw);
    for (const [word, freq] of entries) {
      sessionWords.set(word, freq);
    }
  } catch {
    // corrupted data, ignore
  }
}

export function saveSessionWords(): void {
  const entries = Array.from(sessionWords.entries());
  logseq.updateSettings({ [SESSION_KEY]: JSON.stringify(entries) });
}

export function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveSessionWords();
  }, 2000);
}

export async function preloadSessionWords(): Promise<void> {
  let results: Array<[string]> = [];
  try {
    results =
      (await logseq.DB.datascriptQuery("[:find ?content :limit 2000 :where [?b :block/content ?content]]")) ?? [];
  } catch {
    return;
  }

  const wordPattern = /[a-zA-Z0-9_\-\p{L}]+/gu;
  let added = 0;
  for (const [content] of results) {
    const matches = content.match(wordPattern);
    if (!matches) continue;
    for (const w of matches) {
      if (w.length > 3) {
        const lower = w.toLowerCase();
        if (!sessionWords.has(lower)) {
          sessionWords.set(lower, 1);
          added++;
        }
      }
    }
  }

  if (added > 0) {
    saveSessionWords();
  }
}
