import { beforeEach, describe, expect, it } from "vitest";
import { learnFromBlockContent, resetSessionWords } from "./session";
import { getSuggestions, queryPages, queryTags } from "./suggestions";

function mockDB(pages?: any[][], tags?: any[][], settings: Record<string, unknown> = {}) {
  (globalThis as any).logseq = {
    DB: {
      datascriptQuery: (query: string, ..._args: any[]) => {
        if (query.includes("block/refs")) return tags ?? [];
        return pages ?? [];
      },
    },
    settings: {
      frequencyWeightPage: 0.3,
      frequencyWeightTag: 0.3,
      frequencyWeightDict: 0.3,
      ...settings,
    },
    updateSettings: () => {},
  };
}

describe("queryPages", () => {
  beforeEach(() => {
    mockDB();
  });

  it("returns empty for short prefix", async () => {
    expect(await queryPages("a")).toEqual([]);
  });

  it("returns scored suggestions from DB results", async () => {
    mockDB([["clojure"], ["clojurescript"]]);
    const result = await queryPages("cloj");
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("page");
    expect(result[0].text).toBe("clojure");
    expect(result[1].text).toBe("clojurescript");
  });
});

describe("queryTags", () => {
  beforeEach(() => {
    mockDB();
  });

  it("returns empty for short prefix", async () => {
    expect(await queryTags("a")).toEqual([]);
  });

  it("finds tags created via inline #tag syntax (stored in :block/refs)", async () => {
    mockDB([], [["doku"]]);
    const result = await queryTags("dok");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: "doku", type: "tag" });
    expect(result[0].score).toBeGreaterThan(0);
  });

  it("finds tags via :block/tags as well", async () => {
    mockDB([], [["doku"]]);
    const result = await queryTags("dok");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("tag");
  });
});

describe("getSuggestions", () => {
  beforeEach(() => {
    mockDB();
    resetSessionWords();
  });

  it("returns empty array when no matches", async () => {
    const result = await getSuggestions("xyz");
    expect(result).toEqual([]);
  });

  it("returns ranked and deduplicated results", async () => {
    mockDB([["hello"]]);
    const result = await getSuggestions("hel");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s: any) => s.score > 0)).toBe(true);
  });

  it("prefers tag over page when a name matches both sources", async () => {
    mockDB([["doku"]], [["doku"]]);
    const result = await getSuggestions("dok");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: "doku", type: "tag" });
  });

  it("shows only a tag entry for tag-only names", async () => {
    mockDB([], [["doku"]]);
    const result = await getSuggestions("dok");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: "doku", type: "tag" });
  });

  it("shows only a page entry for pure pages (not used as tags)", async () => {
    mockDB([["pageonly"]], []);
    const result = await getSuggestions("page");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: "pageonly", type: "page" });
  });

  it("attaches session frequency to every suggestion", async () => {
    mockDB([["python"], ["pytest"]]);
    learnFromBlockContent("python python python", null);
    learnFromBlockContent("pytest", null);
    const result = await getSuggestions("py");
    for (const s of result) {
      expect(s.frequency).toBeDefined();
    }
    const pyPage = result.find((s) => s.text === "python" && s.type === "page");
    expect(pyPage?.frequency).toBe(3);
    const ptPage = result.find((s) => s.text === "pytest" && s.type === "page");
    expect(ptPage?.frequency).toBe(1);
  });

  it("ranks higher frequency dictionary words above lower frequency with same match score", async () => {
    mockDB([], [], { customDictionary: "foo,foz", autoDictionaryEnabled: false });
    learnFromBlockContent("foo foo foo foo foo", null);
    learnFromBlockContent("foz foz", null);
    const result = await getSuggestions("fo");
    const dictItems = result.filter((s) => s.type === "dictionary");
    expect(dictItems).toHaveLength(2);
    expect(dictItems[0].text).toBe("foo");
    expect(dictItems[1].text).toBe("foz");
  });

  it("weight=0 disables frequency effect (match score only, insertion order)", async () => {
    mockDB([["python"], ["pytest"]], [], {
      frequencyWeightPage: 0,
      frequencyWeightTag: 0,
      frequencyWeightDict: 0,
    });
    learnFromBlockContent("python python python", null);
    learnFromBlockContent("pytest", null);
    const result = await getSuggestions("py");
    expect(result.length).toBeGreaterThan(1);
    const firstPageIdx = result.findIndex((s) => s.type === "page");
    expect(firstPageIdx).not.toBe(-1);
  });

  it("weight=1 sorts purely by frequency for dictionary words", async () => {
    mockDB([], [], {
      customDictionary: "foo,foz",
      autoDictionaryEnabled: false,
      frequencyWeightPage: 1,
      frequencyWeightTag: 1,
      frequencyWeightDict: 1,
    });
    learnFromBlockContent("foo foo foo foo foo", null);
    learnFromBlockContent("foz foz", null);
    const result = await getSuggestions("fo");
    const dictItems = result.filter((s) => s.type === "dictionary");
    expect(dictItems).toHaveLength(2);
    expect(dictItems[0].text).toBe("foo");
    expect(dictItems[1].text).toBe("foz");
  });

  it("per-type weights: dict weight 1, page weight 0 — only dict sorted by frequency", async () => {
    mockDB([["python"], ["pytest"]], [], {
      customDictionary: "pythagoras,pylon",
      autoDictionaryEnabled: false,
      frequencyWeightPage: 0,
      frequencyWeightTag: 0,
      frequencyWeightDict: 1,
    });
    learnFromBlockContent("pythagoras pythagoras pythagoras", null);
    learnFromBlockContent("pylon pylon", null);
    const result = await getSuggestions("py");
    const pageNames = result.filter((s) => s.type === "page").map((s) => s.text);
    expect(pageNames).toEqual(["python", "pytest"]);
    const dictNames = result.filter((s) => s.type === "dictionary").map((s) => s.text);
    expect(dictNames).toEqual(["pythagoras", "pylon"]);
  });

  it("zero frequency across all suggestions falls back to matchScore + insertion order", async () => {
    mockDB([["python"], ["pytest"]]);
    const result = await getSuggestions("py");
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("python");
    expect(result[1].text).toBe("pytest");
  });
});
