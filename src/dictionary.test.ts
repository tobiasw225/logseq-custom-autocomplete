import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWords, searchWords } from "./dictionary";

function setSettings(overrides: Record<string, unknown> = {}) {
  (globalThis as any).logseq = {
    ...((globalThis as any).logseq ?? {}),
    settings: {
      customDictionary: "",
      ...overrides,
    },
  };
}

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

describe("searchWords", () => {
  it("searches manual words", () => {
    setSettings({ customDictionary: "apple, application, banana" });
    expect(searchWords("app")).toEqual(["apple", "application"]);
  });

  it("returns empty for short prefix", () => {
    setSettings({ customDictionary: "apple, banana" });
    expect(searchWords("a")).toEqual([]);
  });

  it("is case-insensitive", () => {
    setSettings({ customDictionary: "Apple, Banana" });
    const results = searchWords("app");
    expect(results).toEqual(["Apple"]);
  });
});
