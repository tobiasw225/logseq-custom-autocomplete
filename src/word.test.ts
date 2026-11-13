import { describe, expect, it } from "vitest";
import { getWordAtCursor, isWordChar, splitWords } from "./word";

describe("isWordChar", () => {
  it("accepts letters, digits, underscore, and hyphen", () => {
    for (const char of ["a", "Z", "0", "9", "_", "-"]) {
      expect(isWordChar(char)).toBe(true);
    }
  });

  it("accepts unicode letters", () => {
    expect(isWordChar("ö")).toBe(true);
    expect(isWordChar("ß")).toBe(true);
  });

  it("rejects whitespace and punctuation", () => {
    for (const char of [" ", "\n", ".", ",", "!", ":"]) {
      expect(isWordChar(char)).toBe(false);
    }
  });

  it("rejects undefined", () => {
    expect(isWordChar(undefined)).toBe(false);
  });
});

describe("splitWords", () => {
  it("splits on whitespace and punctuation", () => {
    expect(splitWords("hello, world! foo-bar")).toEqual(["hello", "world", "foo-bar"]);
  });

  it("preserves original casing", () => {
    expect(splitWords("Hello WORLD")).toEqual(["Hello", "WORLD"]);
  });

  it("handles unicode letters", () => {
    expect(splitWords("hallo wörld grüße")).toEqual(["hallo", "wörld", "grüße"]);
  });

  it("handles hyphenated words", () => {
    expect(splitWords("use logseq-autocomplete")).toEqual(["use", "logseq-autocomplete"]);
  });

  it("returns an empty array for empty content", () => {
    expect(splitWords("")).toEqual([]);
  });

  it("returns an empty array when there are no word characters", () => {
    expect(splitWords("!!! @@ $$")).toEqual([]);
  });
});

describe("getWordAtCursor", () => {
  it("returns the word at cursor position", () => {
    expect(getWordAtCursor("hello world", 6)).toBe("world");
  });

  it("returns the word at cursor in the middle of a word", () => {
    expect(getWordAtCursor("hello world", 8)).toBe("world");
  });

  it("returns word at start of content", () => {
    expect(getWordAtCursor("hello world", 2)).toBe("hello");
  });

  it("returns single character words with default minLength=1", () => {
    expect(getWordAtCursor("a", 0)).toBe("a");
    expect(getWordAtCursor("ab", 1)).toBe("ab");
  });

  it("returns null for empty content", () => {
    expect(getWordAtCursor("", 0)).toBeNull();
  });

  it("handles unicode letters", () => {
    expect(getWordAtCursor("hallo wörld", 7)).toBe("wörld");
  });

  it("handles hyphenated words", () => {
    expect(getWordAtCursor("use logseq-autocomplete", 5)).toBe("logseq-autocomplete");
  });

  it("handles cursor at end of word", () => {
    expect(getWordAtCursor("hello world", 11)).toBe("world");
  });

  it("handles cursor at end of string with trailing punctuation", () => {
    expect(getWordAtCursor("hello world.", 11)).toBe("world");
  });

  it("returns the word before cursor when cursor is on boundary", () => {
    expect(getWordAtCursor("hello world", 5)).toBe("hello");
  });

  it("respects minLength parameter", () => {
    expect(getWordAtCursor("hello a", 7, 1)).toBe("a");
    expect(getWordAtCursor("hello a", 7, 2)).toBeNull();
  });
});
