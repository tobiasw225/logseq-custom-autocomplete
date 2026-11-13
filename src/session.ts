import { createSessionPersistence } from "./session-persistence";
import type { SessionSettingsPort } from "./session-persistence";
import { preloadWords } from "./session-preload";
import type { DatascriptQuery } from "./session-preload";
import { createWordStore } from "./word-store";

const store = createWordStore();

const settingsPort: SessionSettingsPort = {
  read(key) {
    return (logseq.settings as Record<string, unknown> | undefined)?.[key];
  },
  write(patch) {
    logseq.updateSettings(patch);
  },
};

const persistence = createSessionPersistence(store, settingsPort);

export function learnFromBlockContent(content: string, cursorWord: string | null): void {
  store.learn(content, cursorWord);
  persistence.scheduleSave();
}

export function searchSessionWords(prefix: string): string[] {
  return store.search(prefix);
}

export function getSessionFrequency(word: string): number {
  return store.frequency(word);
}

export function resetSessionWords(): void {
  store.clear();
  persistence.dispose();
}

export function loadSessionWords(): void {
  persistence.load();
}

export function saveSessionWords(): void {
  persistence.save();
}

export function schedulePersist(): void {
  persistence.scheduleSave();
}

export async function preloadSessionWords(): Promise<void> {
  const query: DatascriptQuery = (input) => logseq.DB.datascriptQuery(input);
  const added = await preloadWords(store, query);
  if (added) persistence.save();
}
