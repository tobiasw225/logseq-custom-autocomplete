import { describe, expect, it } from "vitest";
import { createWordStore } from "./word-store";

describe("WordStore.learn", () => {
  it("adds new words from content", () => {
    const store = createWordStore();
    store.learn("hello world", null);
    expect(store.search("he")).toContain("hello");
    expect(store.search("wo")).toContain("world");
  });

  it("increments frequency for repeated words", () => {
    const store = createWordStore();
    store.learn("hello", null);
    store.learn("hello world", null);
    expect(store.frequency("hello")).toBe(2);
    expect(store.frequency("world")).toBe(1);
  });

  it("skips the cursor word case-insensitively", () => {
    const store = createWordStore();
    store.learn("Hello world", "hello");
    expect(store.search("he")).toEqual([]);
    expect(store.search("wo")).toContain("world");
  });

  it("handles unicode letters", () => {
    const store = createWordStore();
    store.learn("hallo wörld grüße", null);
    expect(store.search("wö")).toContain("wörld");
    expect(store.search("gr")).toContain("grüße");
  });

  it("handles empty content and non-word characters", () => {
    const store = createWordStore();
    store.learn("", null);
    store.learn("!!! @@ $$", null);
    expect(store.search("a")).toEqual([]);
  });

  it("handles hyphenated words", () => {
    const store = createWordStore();
    store.learn("use logseq-autocomplete", null);
    expect(store.search("lo")).toContain("logseq-autocomplete");
  });

  it("learns and searches single-character words", () => {
    const store = createWordStore();
    store.learn("a b c hello", null);
    expect(store.search("he")).toContain("hello");
    expect(store.search("a")).toEqual(["a"]);
  });
});

describe("WordStore.search", () => {
  it("returns prefix matches sorted by frequency descending", () => {
    const store = createWordStore();
    store.learn("apple", null);
    store.learn("apple", null);
    store.learn("apple", null);
    store.learn("application", null);
    store.learn("application", null);
    store.learn("apt", null);

    expect(store.search("ap")).toEqual(["apple", "application", "apt"]);
  });

  it("keeps insertion order for equal frequencies", () => {
    const store = createWordStore();
    store.learn("ab ac", null);
    expect(store.search("a")).toEqual(["ab", "ac"]);
  });

  it("returns empty array when no match", () => {
    const store = createWordStore();
    store.learn("hello world", null);
    expect(store.search("xyz")).toEqual([]);
  });

  it("returns results for single-character prefix", () => {
    const store = createWordStore();
    store.learn("hello", null);
    expect(store.search("h")).toEqual(["hello"]);
  });

  it("matches case-insensitively", () => {
    const store = createWordStore();
    store.learn("Hello", null);
    expect(store.search("hel")).toContain("hello");
    expect(store.search("Hel")).toContain("hello");
  });
});

describe("WordStore.frequency", () => {
  it("returns frequency for learned word", () => {
    const store = createWordStore();
    store.learn("hello", null);
    store.learn("hello", null);
    expect(store.frequency("hello")).toBe(2);
  });

  it("returns 0 for unknown word", () => {
    const store = createWordStore();
    expect(store.frequency("nonexistent")).toBe(0);
  });

  it("looks up case-insensitively", () => {
    const store = createWordStore();
    store.learn("Hello", null);
    expect(store.frequency("hello")).toBe(1);
  });
});

describe("WordStore.has", () => {
  it("reports known words case-insensitively", () => {
    const store = createWordStore();
    store.learn("Hello", null);
    expect(store.has("hello")).toBe(true);
    expect(store.has("missing")).toBe(false);
  });
});

describe("WordStore.snapshot / restore", () => {
  it("round-trips entries", () => {
    const store = createWordStore();
    store.learn("hello world", null);
    store.learn("hello", null);

    const entries = store.snapshot();
    const restored = createWordStore();
    restored.restore(entries);

    expect(restored.frequency("hello")).toBe(2);
    expect(restored.frequency("world")).toBe(1);
  });

  it("restore overwrites existing frequencies without clearing", () => {
    const store = createWordStore();
    store.learn("keep hello", null);
    store.restore([
      ["hello", 5],
      ["new", 1],
    ]);

    expect(store.frequency("keep")).toBe(1);
    expect(store.frequency("hello")).toBe(5);
    expect(store.frequency("new")).toBe(1);
  });
});

describe("WordStore.clear", () => {
  it("removes all words", () => {
    const store = createWordStore();
    store.learn("hello world", null);
    expect(store.search("he")).not.toEqual([]);
    store.clear();
    expect(store.search("he")).toEqual([]);
  });
});
