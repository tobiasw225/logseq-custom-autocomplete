import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSessionFrequency,
  learnFromBlockContent,
  loadSessionWords,
  resetSessionWords,
  saveSessionWords,
  searchSessionWords,
} from "./session";

function setSettings(overrides: Record<string, unknown> = {}) {
  const mutableSettings: Record<string, unknown> = {
    sessionDictionary: "",
    ...overrides,
  };
  (globalThis as any).logseq = {
    ...((globalThis as any).logseq ?? {}),
    settings: mutableSettings,
    updateSettings: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(mutableSettings, patch);
    }),
  };
}

beforeEach(() => {
  resetSessionWords();
});

afterEach(() => {
  delete (globalThis as any).logseq;
});

describe("learnFromBlockContent", () => {
  it("adds new words from content", () => {
    learnFromBlockContent("hello world", null);
    expect(searchSessionWords("he")).toContain("hello");
    expect(searchSessionWords("wo")).toContain("world");
  });

  it("increments frequency for repeated words", () => {
    learnFromBlockContent("hello", null);
    learnFromBlockContent("hello world", null);
    expect(getSessionFrequency("hello")).toBe(2);
    expect(getSessionFrequency("world")).toBe(1);
  });

  it("skips the cursor word", () => {
    learnFromBlockContent("hello world", "hello");
    expect(searchSessionWords("he")).toEqual([]);
    expect(searchSessionWords("wo")).toContain("world");
  });

  it("handles unicode letters", () => {
    learnFromBlockContent("hallo wörld grüße", null);
    expect(searchSessionWords("wö")).toContain("wörld");
    expect(searchSessionWords("gr")).toContain("grüße");
  });

  it("handles empty content", () => {
    learnFromBlockContent("", null);
    expect(searchSessionWords("a")).toEqual([]);
  });

  it("handles content with no word characters", () => {
    learnFromBlockContent("!!! @@ $$", null);
    expect(searchSessionWords("a")).toEqual([]);
  });

  it("handles hyphenated words", () => {
    learnFromBlockContent("use logseq-autocomplete", null);
    expect(searchSessionWords("lo")).toContain("logseq-autocomplete");
  });

  it("learns single-character words but search requires minimum 2 chars", () => {
    learnFromBlockContent("a b c hello", null);
    expect(searchSessionWords("he")).toContain("hello");
    expect(searchSessionWords("a")).toEqual([]);
  });
});

describe("searchSessionWords", () => {
  it("returns prefix matches sorted by frequency descending", () => {
    learnFromBlockContent("apple", null);
    learnFromBlockContent("apple", null);
    learnFromBlockContent("apple", null);
    learnFromBlockContent("application", null);
    learnFromBlockContent("application", null);
    learnFromBlockContent("apt", null);

    const result = searchSessionWords("ap");
    expect(result).toEqual(["apple", "application", "apt"]);
  });

  it("returns empty array when no match", () => {
    learnFromBlockContent("hello world", null);
    expect(searchSessionWords("xyz")).toEqual([]);
  });

  it("returns empty array for prefix shorter than 2", () => {
    learnFromBlockContent("hello", null);
    expect(searchSessionWords("h")).toEqual([]);
  });

  it("case-insensitive prefix matching", () => {
    learnFromBlockContent("Hello", null);
    expect(searchSessionWords("hel")).toContain("hello");
    expect(searchSessionWords("Hel")).toContain("hello");
  });
});

describe("getSessionFrequency", () => {
  it("returns frequency for learned word", () => {
    learnFromBlockContent("hello", null);
    learnFromBlockContent("hello", null);
    expect(getSessionFrequency("hello")).toBe(2);
  });

  it("returns 0 for unknown word", () => {
    expect(getSessionFrequency("nonexistent")).toBe(0);
  });

  it("case-insensitive lookup", () => {
    learnFromBlockContent("Hello", null);
    expect(getSessionFrequency("hello")).toBe(1);
  });
});

describe("resetSessionWords", () => {
  it("clears all session words", () => {
    learnFromBlockContent("hello world", null);
    expect(searchSessionWords("he")).not.toEqual([]);
    resetSessionWords();
    expect(searchSessionWords("he")).toEqual([]);
  });
});

describe("persistence", () => {
  it("saveSessionWords serializes map as JSON string via updateSettings", () => {
    setSettings();
    learnFromBlockContent("hello world", null);
    learnFromBlockContent("hello", null);

    saveSessionWords();

    const updateCalls = (globalThis as any).logseq.updateSettings.mock.calls;
    expect(updateCalls.length).toBe(1);
    const raw = updateCalls[0][0].sessionDictionary;
    const parsed: Array<[string, number]> = JSON.parse(raw);
    expect(parsed).toContainEqual(["hello", 2]);
    expect(parsed).toContainEqual(["world", 1]);
  });

  it("loadSessionWords restores map from settings JSON", () => {
    setSettings({ sessionDictionary: '[["hello",3],["world",1]]' });
    loadSessionWords();

    expect(searchSessionWords("he")).toContain("hello");
    expect(searchSessionWords("wo")).toContain("world");
    expect(getSessionFrequency("hello")).toBe(3);
    expect(getSessionFrequency("world")).toBe(1);
  });

  it("loadSessionWords handles empty settings gracefully", () => {
    setSettings({ sessionDictionary: "" });
    loadSessionWords();
    expect(searchSessionWords("a")).toEqual([]);
  });

  it("loadSessionWords handles missing settings key gracefully", () => {
    setSettings({});
    loadSessionWords();
    expect(searchSessionWords("a")).toEqual([]);
  });

  it("loadSessionWords handles corrupted JSON gracefully", () => {
    setSettings({ sessionDictionary: "not-json-at-all" });
    loadSessionWords();
    expect(searchSessionWords("a")).toEqual([]);
  });

  it("full round-trip: learn → save → reset → load → same words available", () => {
    setSettings();

    learnFromBlockContent("persist test word", null);
    learnFromBlockContent("persist", null);
    saveSessionWords();

    resetSessionWords();
    expect(searchSessionWords("per")).toEqual([]);

    loadSessionWords();
    expect(searchSessionWords("per")).toContain("persist");
    expect(searchSessionWords("tes")).toContain("test");
    expect(searchSessionWords("wor")).toContain("word");
    expect(getSessionFrequency("persist")).toBe(2);
  });
});
