import { describe, expect, it } from "vitest";
import { getWordAtCursor, matchScore } from "./utils";

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
