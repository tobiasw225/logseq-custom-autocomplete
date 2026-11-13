import { applyCompletion } from "./completion";
import type { CompletionEditor, CompletionHooks } from "./completion";
import { isInIgnoredContext } from "./context";
import type { Suggestion } from "./utils";
import { getWordAtCursor, isWordChar } from "./word";

export interface SuggestionCursor {
  pos: number;
  rect: { left: number; top: number; height: number };
}

export interface SuggestionEditor extends CompletionEditor {
  getEditingCursorPosition(): Promise<SuggestionCursor | null>;
}

export interface SuggestionUI {
  isVisible(): boolean;
  show(suggestions: Suggestion[], x: number, y: number, prefix: string): void;
  hide(): void;
  getCurrentSuggestions(): Suggestion[];
}

export interface SuggestionSettings {
  read(key: string): unknown;
}

export interface SuggestionClock {
  now(): number;
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

export type SuggestionQuery = (prefix: string) => Suggestion[];

export interface SuggestionSessionDeps {
  editor: SuggestionEditor;
  ui: SuggestionUI;
  settings: SuggestionSettings;
  clock: SuggestionClock;
  query: SuggestionQuery;
  learn(content: string, cursorWord: string | null): void;
}

export interface SuggestionSession {
  onContentChanged(): Promise<void>;
  accept(): Promise<boolean>;
  dismiss(): void;
  dispose(): void;
}

export function createSuggestionSession(deps: SuggestionSessionDeps): SuggestionSession {
  const { editor, ui, settings, clock, query, learn } = deps;

  let cachedMinInterval: number | null = null;
  let lastPrefix = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastCheck: number | null = null;
  let isProcessing = false;

  function minInterval(): number {
    if (cachedMinInterval === null) {
      cachedMinInterval = Number(settings.read("minInterval") ?? 80);
    }
    return cachedMinInterval;
  }

  function cancelDebounce(): void {
    if (debounceTimer === null) return;
    clock.clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  function resetPrefix(): void {
    lastPrefix = "";
  }

  function hooks(): CompletionHooks {
    return {
      dismiss: () => {
        if (ui.isVisible()) ui.hide();
      },
      reset: resetPrefix,
    };
  }

  async function runQuery(word: string, cursor: SuggestionCursor): Promise<void> {
    try {
      const suggestions = query(word);
      if (suggestions.length > 0) {
        const autoExpand = settings.read("autoExpandOnUnique") === true;
        if (autoExpand && suggestions.length === 1) {
          const applied = await applyCompletion(
            editor,
            hooks(),
            { kind: "suggestion", suggestion: suggestions[0] },
            word,
          );
          if (applied) return;
        }
        ui.show(suggestions, cursor.rect.left, cursor.rect.top + cursor.rect.height + 4, word);
        return;
      }

      if (ui.isVisible()) ui.hide();
    } catch (err) {
      console.error("autocomplete query error:", err);
    }
  }

  async function onContentChanged(): Promise<void> {
    if (isProcessing) return;

    const now = clock.now();
    if (lastCheck !== null && now - lastCheck < minInterval()) return;
    lastCheck = now;

    isProcessing = true;
    try {
      const block = await editor.getCurrentBlock();
      if (!block) {
        if (ui.isVisible()) ui.hide();
        return;
      }

      const content = block.content ?? "";
      const cursor = await editor.getEditingCursorPosition();
      if (!cursor) {
        if (ui.isVisible()) ui.hide();
        return;
      }

      if (settings.read("enableContextFilter") !== false) {
        if (isInIgnoredContext(content, cursor.pos)) {
          if (ui.isVisible()) ui.hide();
          return;
        }
      }

      const atEnd = cursor.pos >= content.length;
      const cursorChar = content[cursor.pos];
      if (!atEnd && cursorChar && !isWordChar(cursorChar)) {
        if (ui.isVisible()) ui.hide();
        return;
      }

      const word = getWordAtCursor(content, cursor.pos);
      learn(content, word);
      if (!word) {
        if (ui.isVisible()) ui.hide();
        return;
      }

      if (word === lastPrefix && ui.isVisible()) return;
      lastPrefix = word;

      const delay = Number(settings.read("suggestionDebounceDelay") ?? 80);
      cancelDebounce();
      debounceTimer = clock.setTimeout(() => {
        debounceTimer = null;
        runQuery(word, cursor).catch(console.error);
      }, delay);
    } catch (err) {
      console.error("autocomplete check error:", err);
    } finally {
      isProcessing = false;
    }
  }

  async function accept(): Promise<boolean> {
    if (!ui.isVisible()) return false;

    const suggestions = ui.getCurrentSuggestions();
    if (suggestions.length === 0) return false;

    if (suggestions.length === 1) {
      return applyCompletion(editor, hooks(), {
        kind: "suggestion",
        suggestion: suggestions[0],
      });
    }

    return applyCompletion(editor, hooks(), {
      kind: "commonPrefix",
      suggestions,
    });
  }

  function dismiss(): void {
    cancelDebounce();
    if (ui.isVisible()) ui.hide();
    resetPrefix();
  }

  function dispose(): void {
    cancelDebounce();
    resetPrefix();
  }

  return { onContentChanged, accept, dismiss, dispose };
}
