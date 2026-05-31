import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAutoWords, getAutoWordsLoaded, loadAutoWords, loadWords, resetAutoWords, searchWords } from "./dictionary";

function mockDB(rows: Array<[string]> = []) {
  (globalThis as any).logseq = {
    ...((globalThis as any).logseq ?? {}),
    DB: {
      datascriptQuery: vi.fn().mockResolvedValue(rows),
    },
  };
}

function setSettings(overrides: Record<string, unknown> = {}) {
  (globalThis as any).logseq = {
    ...((globalThis as any).logseq ?? {}),
    settings: {
      customDictionary: "",
      autoDictionaryEnabled: false,
      autoDictionaryMaxWords: 200,
      ...overrides,
    },
  };
}

beforeEach(() => {
  resetAutoWords();
});

afterEach(() => {
  delete (globalThis as any).logseq;
});

describe("loadWords", () => {
  it("returns an empty array for empty settings", () => {
    setSettings({ customDictionary: "" });
    expect(loadWords()).toEqual([]);
  });

  it("parses comma-separated words", () => {
    setSettings({ customDictionary: "foo, bar, baz" });
    expect(loadWords()).toEqual(["foo", "bar", "baz"]);
  });

  it("trims whitespace", () => {
    setSettings({ customDictionary: "  foo , bar  " });
    expect(loadWords()).toEqual(["foo", "bar"]);
  });

  it("filters empty entries", () => {
    setSettings({ customDictionary: "foo,,bar,," });
    expect(loadWords()).toEqual(["foo", "bar"]);
  });
});

describe("loadAutoWords", () => {
  it("returns empty when auto-dictionary is disabled and skips DB query", async () => {
    setSettings({ autoDictionaryEnabled: false });
    mockDB();
    const result = await loadAutoWords();
    expect(result).toEqual([]);
    expect((globalThis as any).logseq.DB.datascriptQuery).not.toHaveBeenCalled();
  });

  it("returns empty when auto-dictionary is enabled but DB returns nothing", async () => {
    setSettings({ autoDictionaryEnabled: true });
    mockDB([]);
    const result = await loadAutoWords();
    expect(result).toEqual([]);
  });

  it("extracts words longer than 3 characters from blocks", async () => {
    setSettings({ autoDictionaryEnabled: true });
    mockDB([["hello world foo bar some"], ["longer text here please"]]);
    const result = await loadAutoWords();
    expect(result).toContain("hello");
    expect(result).toContain("world");
    expect(result).toContain("some");
    expect(result).toContain("longer");
    expect(result).toContain("text");
    expect(result).toContain("here");
    expect(result).toContain("please");
    expect(result).not.toContain("foo");
    expect(result).not.toContain("bar");
  });

  it("deduplicates words case-insensitively", async () => {
    setSettings({ autoDictionaryEnabled: true });
    mockDB([["Hello World"], ["hello world again"]]);
    const result = await loadAutoWords();
    expect(result.length).toBeLessThan(5);
  });

  it("extracts all eligible words regardless of maxWords setting", async () => {
    setSettings({ autoDictionaryEnabled: true, autoDictionaryMaxWords: 3 });
    mockDB([["one two three four five six"]]);
    const result = await loadAutoWords();
    expect(result).toContain("three");
    expect(result).toContain("four");
    expect(result).toContain("five");
    expect(result).not.toContain("one");
    expect(result).not.toContain("two");
    expect(result).not.toContain("six");
  });

  it("handles unicode letters", async () => {
    setSettings({ autoDictionaryEnabled: true });
    mockDB([["wörld münchen café"]]);
    const result = await loadAutoWords();
    expect(result).toContain("wörld");
    expect(result).toContain("münchen");
    expect(result).toContain("café");
  });

  it("handles hyphenated words", async () => {
    setSettings({ autoDictionaryEnabled: true });
    mockDB([["logseq-autocomplete is great"]]);
    const result = await loadAutoWords();
    expect(result).toContain("logseq-autocomplete");
    expect(result).toContain("great");
  });

  it("sets loaded state after completion", async () => {
    setSettings({ autoDictionaryEnabled: true });
    mockDB([]);
    expect(getAutoWordsLoaded()).toBe(false);
    await loadAutoWords();
    expect(getAutoWordsLoaded()).toBe(true);
  });

  it("sets loaded state even when disabled", async () => {
    setSettings({ autoDictionaryEnabled: false });
    mockDB();
    expect(getAutoWordsLoaded()).toBe(false);
    await loadAutoWords();
    expect(getAutoWordsLoaded()).toBe(true);
  });

  it("stores loaded words in getAutoWords", async () => {
    setSettings({ autoDictionaryEnabled: true });
    mockDB([["hello world"]]);
    await loadAutoWords();
    expect(getAutoWords()).toEqual(["hello", "world"]);
  });
});

describe("searchWords with auto-dictionary", () => {
  it("searches only manual words when auto not loaded", async () => {
    setSettings({ customDictionary: "apple, application, banana" });
    expect(searchWords("app")).toEqual(["apple", "application"]);
  });

  it("searches only manual words when auto is disabled", async () => {
    setSettings({ customDictionary: "apple, banana", autoDictionaryEnabled: false });
    mockDB([["auto-word"]]);
    await loadAutoWords();
    expect(searchWords("app")).toEqual(["apple"]);
    expect(searchWords("aut")).toEqual([]);
  });

  it("merges auto and manual words when auto is enabled", async () => {
    setSettings({ customDictionary: "apple, banana", autoDictionaryEnabled: true });
    mockDB([["auto-word something"]]);
    await loadAutoWords();
    expect(searchWords("app")).toEqual(["apple"]);
    expect(searchWords("aut")).toEqual(["auto-word"]);
    expect(searchWords("ban")).toEqual(["banana"]);
  });

  it("deduplicates merged words", async () => {
    setSettings({ customDictionary: "apple", autoDictionaryEnabled: true });
    mockDB([["apple banana"]]);
    await loadAutoWords();
    const results = searchWords("app");
    expect(results.filter((w) => w.toLowerCase() === "apple").length).toBe(1);
  });

  it("returns empty for short prefix", () => {
    setSettings({ customDictionary: "apple, banana" });
    expect(searchWords("a")).toEqual([]);
  });

  it("is case-insensitive when merging", async () => {
    setSettings({ customDictionary: "Apple", autoDictionaryEnabled: true });
    mockDB([["apple Banana"]]);
    await loadAutoWords();
    const results = searchWords("app");
    expect(results).toHaveLength(1);
  });
});
