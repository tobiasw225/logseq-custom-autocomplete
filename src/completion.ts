import { longestCommonPrefix } from "./utils";
import type { Suggestion } from "./utils";
import { getWordAtCursor } from "./word";

export type CompletionStrategy =
  | { kind: "suggestion"; suggestion: Suggestion }
  | { kind: "commonPrefix"; suggestions: Suggestion[] };

export interface CompletionReplacement {
  index: number;
  word: string;
  replacement: string;
  content: string;
}

export interface CompletionEditor {
  getCurrentBlock(): Promise<{ uuid: string; content?: string | null } | null>;
  getEditingCursorPosition(): Promise<{ pos: number } | null>;
  updateBlock(uuid: string, content: string): Promise<unknown>;
}

export interface CompletionHooks {
  dismiss(): void;
  reset(): void;
}

function replacementText(strategy: CompletionStrategy, word: string): string | null {
  if (strategy.kind === "commonPrefix") {
    return longestCommonPrefix(strategy.suggestions, word);
  }

  const lowerWord = word.toLowerCase();
  const text = strategy.suggestion.text;
  const lowerText = text.toLowerCase();
  return lowerText.startsWith(lowerWord) ? word + text.slice(lowerWord.length) : text;
}

export function computeReplacement(
  content: string,
  cursorPos: number,
  strategy: CompletionStrategy,
  expectedWord?: string,
): CompletionReplacement | null {
  const word = getWordAtCursor(content, cursorPos);
  if (!word) return null;
  if (expectedWord !== undefined && word !== expectedWord) return null;

  const replacement = replacementText(strategy, word);
  if (!replacement) return null;

  const index = content.indexOf(word, Math.max(0, cursorPos - word.length));
  if (index === -1) return null;

  return {
    index,
    word,
    replacement,
    content: content.slice(0, index) + replacement + content.slice(index + word.length),
  };
}

export async function applyCompletion(
  editor: CompletionEditor,
  hooks: CompletionHooks,
  strategy: CompletionStrategy,
  expectedWord?: string,
): Promise<boolean> {
  try {
    const block = await editor.getCurrentBlock();
    if (!block) return false;

    const cursorPos = await editor.getEditingCursorPosition();
    if (!cursorPos) return false;

    const replacement = computeReplacement(block.content ?? "", cursorPos.pos, strategy, expectedWord);
    if (!replacement) return false;

    await editor.updateBlock(block.uuid, replacement.content);
    return true;
  } catch (err) {
    console.error("autocomplete insert error:", err);
    return false;
  } finally {
    hooks.dismiss();
    hooks.reset();
  }
}
