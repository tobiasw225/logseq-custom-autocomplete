import { describe, expect, it } from "vitest";
import { getWordAtCursor, longestCommonPrefix, matchScore } from "./utils";
import type { Suggestion } from "./utils";

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

describe("matchScore", () => {
  it("exact match scores 100", () => {
    expect(matchScore("hello", "hello")).toBe(100);
  });

  it("case-insensitive exact match scores 100", () => {
    expect(matchScore("Hello", "hello")).toBe(100);
  });

  it("prefix match scores between 80-90", () => {
    const score = matchScore("hello", "he");
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThan(90);
  });

  it("longer prefix match scores higher than shorter", () => {
    const short = matchScore("hello", "he");
    const long = matchScore("hello", "hel");
    expect(long).toBeGreaterThan(short);
  });

  it("substring match scores 50", () => {
    expect(matchScore("wellhello", "hello")).toBe(50);
  });

  it("no match scores 0", () => {
    expect(matchScore("hello", "xyz")).toBe(0);
  });
});

describe("longestCommonPrefix", () => {
  function s(text: string): Suggestion {
    return { text, type: "dictionary", score: 0 };
  }

  it("returns full text for a single suggestion", () => {
    expect(longestCommonPrefix([s("hello")], "hel")).toBe("hello");
  });

  it("returns common prefix across multiple suggestions", () => {
    expect(longestCommonPrefix([s("hello"), s("help")], "he")).toBe("hel");
  });

  it("returns null when common prefix is not longer than typed word", () => {
    expect(longestCommonPrefix([s("hello"), s("help")], "hel")).toBeNull();
  });

  it("returns null when no suggestions start with typed word", () => {
    expect(longestCommonPrefix([s("hello")], "xyz")).toBeNull();
  });

  it("returns null for empty suggestions", () => {
    expect(longestCommonPrefix([], "hel")).toBeNull();
  });

  it("preserves user casing on the typed portion", () => {
    expect(longestCommonPrefix([s("Hello")], "Hel")).toBe("Hello");
  });

  it("matches case-insensitively and preserves user casing", () => {
    expect(longestCommonPrefix([s("Hello")], "hel")).toBe("hello");
  });

  it("computes common prefix across suggestions of different types", () => {
    const suggestions: Suggestion[] = [
      { text: "blauwal", type: "page", score: 0 },
      { text: "blaupause", type: "tag", score: 0 },
    ];
    expect(longestCommonPrefix(suggestions, "bl")).toBe("blau");
  });

  it("handles three or more suggestions", () => {
    expect(longestCommonPrefix([s("abcde"), s("abcdf"), s("abcdg")], "ab")).toBe("abcd");
  });
});
