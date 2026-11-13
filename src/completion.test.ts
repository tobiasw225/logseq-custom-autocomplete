import { describe, expect, it, vi } from "vitest";
import { applyCompletion, computeReplacement } from "./completion";
import type { CompletionEditor, CompletionHooks } from "./completion";
import type { Suggestion } from "./utils";

function suggestion(text: string): Suggestion {
  return { text, type: "dictionary", score: 100 };
}

function fakeEditor(overrides: Partial<CompletionEditor> = {}): CompletionEditor {
  return {
    getCurrentBlock: vi.fn().mockResolvedValue({ uuid: "block-uuid", content: "Blau" }),
    getEditingCursorPosition: vi.fn().mockResolvedValue({ pos: 4 }),
    updateBlock: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function fakeHooks(): CompletionHooks {
  return { dismiss: vi.fn(), reset: vi.fn() };
}

describe("computeReplacement", () => {
  it("appends the suggestion suffix and preserves typed casing", () => {
    expect(computeReplacement("Blau", 4, { kind: "suggestion", suggestion: suggestion("blaupause") })).toEqual({
      index: 0,
      word: "Blau",
      replacement: "Blaupause",
      content: "Blaupause",
    });
  });

  it("inserts the full suggestion when it does not start with the word", () => {
    const result = computeReplacement("xy", 2, { kind: "suggestion", suggestion: suggestion("abc") });
    expect(result?.content).toBe("abc");
  });

  it("uses the longest common prefix across suggestions", () => {
    const result = computeReplacement("bl", 2, {
      kind: "commonPrefix",
      suggestions: [suggestion("blauwal"), suggestion("blaupause")],
    });
    expect(result?.content).toBe("blau");
  });

  it("replaces only the word at the cursor, not earlier occurrences", () => {
    const result = computeReplacement("ab ab", 5, { kind: "suggestion", suggestion: suggestion("abc") });
    expect(result).toEqual({
      index: 3,
      word: "ab",
      replacement: "abc",
      content: "ab abc",
    });
  });

  it("returns null when there is no word at the cursor", () => {
    expect(computeReplacement("   ", 1, { kind: "suggestion", suggestion: suggestion("abc") })).toBeNull();
  });

  it("returns null when the common prefix is not longer than the word", () => {
    expect(computeReplacement("ab", 2, { kind: "commonPrefix", suggestions: [suggestion("ab")] })).toBeNull();
  });

  it("returns null when there are no suggestions", () => {
    expect(computeReplacement("ab", 2, { kind: "commonPrefix", suggestions: [] })).toBeNull();
  });

  it("returns null when the expected word does not match", () => {
    expect(computeReplacement("buxy", 4, { kind: "suggestion", suggestion: suggestion("buch") }, "bux")).toBeNull();
  });
});

describe("applyCompletion", () => {
  it("updates the block and cleans up on success", async () => {
    const editor = fakeEditor();
    const hooks = fakeHooks();

    const applied = await applyCompletion(editor, hooks, {
      kind: "suggestion",
      suggestion: suggestion("blaupause"),
    });

    expect(applied).toBe(true);
    expect(editor.updateBlock).toHaveBeenCalledWith("block-uuid", "Blaupause");
    expect(hooks.dismiss).toHaveBeenCalledTimes(1);
    expect(hooks.reset).toHaveBeenCalledTimes(1);
  });

  it("cleans up without updating when there is no block", async () => {
    const editor = fakeEditor({ getCurrentBlock: vi.fn().mockResolvedValue(null) });
    const hooks = fakeHooks();

    const applied = await applyCompletion(editor, hooks, {
      kind: "suggestion",
      suggestion: suggestion("blaupause"),
    });

    expect(applied).toBe(false);
    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(hooks.dismiss).toHaveBeenCalledTimes(1);
    expect(hooks.reset).toHaveBeenCalledTimes(1);
  });

  it("cleans up without updating when there is no cursor", async () => {
    const editor = fakeEditor({ getEditingCursorPosition: vi.fn().mockResolvedValue(null) });
    const hooks = fakeHooks();

    const applied = await applyCompletion(editor, hooks, {
      kind: "suggestion",
      suggestion: suggestion("blaupause"),
    });

    expect(applied).toBe(false);
    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(hooks.dismiss).toHaveBeenCalledTimes(1);
    expect(hooks.reset).toHaveBeenCalledTimes(1);
  });

  it("does not update when the expected word is stale, but still cleans up", async () => {
    const editor = fakeEditor({
      getCurrentBlock: vi.fn().mockResolvedValue({ uuid: "block-uuid", content: "buxy" }),
      getEditingCursorPosition: vi.fn().mockResolvedValue({ pos: 4 }),
    });
    const hooks = fakeHooks();

    const applied = await applyCompletion(editor, hooks, { kind: "suggestion", suggestion: suggestion("buch") }, "bux");

    expect(applied).toBe(false);
    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(hooks.dismiss).toHaveBeenCalledTimes(1);
    expect(hooks.reset).toHaveBeenCalledTimes(1);
  });

  it("cleans up and reports failure when the update throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const editor = fakeEditor({ updateBlock: vi.fn().mockRejectedValue(new Error("boom")) });
    const hooks = fakeHooks();

    const applied = await applyCompletion(editor, hooks, {
      kind: "suggestion",
      suggestion: suggestion("blaupause"),
    });

    expect(applied).toBe(false);
    expect(hooks.dismiss).toHaveBeenCalledTimes(1);
    expect(hooks.reset).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
