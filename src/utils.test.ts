import { describe, expect, it } from "vitest";
import { longestCommonPrefix, matchScore } from "./utils";
import type { Suggestion } from "./utils";

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

  it("computes common prefix across multiple suggestions", () => {
    const suggestions: Suggestion[] = [
      { text: "blauwal", type: "dictionary", score: 0 },
      { text: "blaupause", type: "dictionary", score: 0 },
    ];
    expect(longestCommonPrefix(suggestions, "bl")).toBe("blau");
  });

  it("handles three or more suggestions", () => {
    expect(longestCommonPrefix([s("abcde"), s("abcdf"), s("abcdg")], "ab")).toBe("abcd");
  });
});
