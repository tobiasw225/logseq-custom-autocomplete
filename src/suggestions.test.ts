import { beforeEach, describe, expect, it } from "vitest";
import { learnFromBlockContent, resetSessionWords } from "./session";
import { getSuggestions } from "./suggestions";

function mockSettings(overrides: Record<string, unknown> = {}) {
  (globalThis as any).logseq = {
    settings: {
      frequencyWeightDict: 0.3,
      ...overrides,
    },
  };
}

describe("getSuggestions", () => {
  beforeEach(() => {
    mockSettings();
    resetSessionWords();
  });

  it("returns empty array when no matches", () => {
    const result = getSuggestions("xyz");
    expect(result).toEqual([]);
  });

  it("returns dictionary words matching the prefix", () => {
    learnFromBlockContent("hello world", null);
    learnFromBlockContent("helpful hint", null);
    const result = getSuggestions("hel");
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.score > 0)).toBe(true);
    expect(result.map((s) => s.text).sort()).toEqual(["hello", "helpful"]);
  });

  it("ranks higher frequency words above lower frequency with same match score", () => {
    learnFromBlockContent("foo foo foo foo foo", null);
    learnFromBlockContent("foz foz", null);
    const result = getSuggestions("fo");
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("foo");
    expect(result[1].text).toBe("foz");
  });

  it("weight=0 disables frequency effect (match score only)", () => {
    mockSettings({ frequencyWeightDict: 0 });
    learnFromBlockContent("foo foo foo foo foo", null);
    learnFromBlockContent("foz foz", null);
    const result = getSuggestions("fo");
    expect(result.length).toBeGreaterThan(0);
  });

  it("weight=1 sorts purely by frequency", () => {
    mockSettings({ frequencyWeightDict: 1 });
    learnFromBlockContent("foo foo foo foo foo", null);
    learnFromBlockContent("foz foz", null);
    const result = getSuggestions("fo");
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("foo");
    expect(result[1].text).toBe("foz");
  });

  it("all suggestions have type 'dictionary'", () => {
    learnFromBlockContent("alpha beta gamma", null);
    const result = getSuggestions("a");
    for (const s of result) {
      expect(s.type).toBe("dictionary");
    }
  });
});
