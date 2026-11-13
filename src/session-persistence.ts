import type { WordEntries, WordStore } from "./word-store";

export const SESSION_KEY = "sessionDictionary";

export interface SessionSettingsPort {
  read(key: string): unknown;
  write(patch: Record<string, unknown>): void;
}

export interface SessionPersistence {
  load(): void;
  save(): void;
  scheduleSave(): void;
  dispose(): void;
}

export function createSessionPersistence(
  store: WordStore,
  settings: SessionSettingsPort,
  delay = 2000,
): SessionPersistence {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function save(): void {
    settings.write({ [SESSION_KEY]: JSON.stringify(store.snapshot()) });
  }

  function cancel(): void {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  }

  return {
    load() {
      try {
        const raw = settings.read(SESSION_KEY);
        if (!raw || typeof raw !== "string") return;
        store.restore(JSON.parse(raw) as WordEntries);
      } catch {
        return;
      }
    },

    save,

    scheduleSave() {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        save();
      }, delay);
    },

    dispose: cancel,
  };
}
