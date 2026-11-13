import { describe, expect, it, vi } from "vitest";
import { PRELOAD_QUERY, preloadWords } from "./session-preload";
import type { DatascriptQuery } from "./session-preload";
import { createWordStore } from "./word-store";

function queryResolving(rows: Array<[string]> | null | undefined): DatascriptQuery {
  return vi.fn().mockResolvedValue(rows);
}

describe("preloadWords", () => {
  it("queries blocks with the preload query", async () => {
    const store = createWordStore();
    const query = queryResolving([]);

    await preloadWords(store, query);

    expect(query).toHaveBeenCalledWith(PRELOAD_QUERY);
  });

  it("returns false and keeps the store empty when the query throws", async () => {
    const store = createWordStore();
    const query = vi.fn().mockRejectedValue(new Error("no db"));

    await expect(preloadWords(store, query)).resolves.toBe(false);
    expect(store.snapshot()).toEqual([]);
  });

  it("handles a null query result", async () => {
    const store = createWordStore();
    const query = queryResolving(null);

    await expect(preloadWords(store, query)).resolves.toBe(false);
    expect(store.snapshot()).toEqual([]);
  });

  it("extracts words longer than 3 characters from blocks", async () => {
    const store = createWordStore();
    const query = queryResolving([["hello world foo bar some"], ["longer text here please"]]);

    await preloadWords(store, query);

    expect(store.search("hel")).toContain("hello");
    expect(store.search("wor")).toContain("world");
    expect(store.search("lon")).toContain("longer");
    expect(store.search("foo")).toEqual([]);
    expect(store.search("bar")).toEqual([]);
  });

  it("handles unicode letters", async () => {
    const store = createWordStore();
    const query = queryResolving([["wörld münchen café"]]);

    await preloadWords(store, query);

    expect(store.search("wör")).toContain("wörld");
    expect(store.search("mün")).toContain("münchen");
    expect(store.search("caf")).toContain("café");
  });

  it("handles hyphenated words", async () => {
    const store = createWordStore();
    const query = queryResolving([["logseq-autocomplete is great"]]);

    await preloadWords(store, query);

    expect(store.search("lo")).toContain("logseq-autocomplete");
    expect(store.search("gr")).toContain("great");
  });

  it("preserves existing session word frequencies", async () => {
    const store = createWordStore();
    store.learn("hello world", null);
    store.learn("hello", null);

    await preloadWords(store, queryResolving([["hello newword"]]));

    expect(store.frequency("hello")).toBe(2);
    expect(store.frequency("world")).toBe(1);
    expect(store.frequency("newword")).toBe(1);
  });

  it("deduplicates words within a preload batch", async () => {
    const store = createWordStore();

    await preloadWords(store, queryResolving([["hello hello"], ["hello"]]));

    expect(store.frequency("hello")).toBe(1);
  });

  it("returns true only when new words were added", async () => {
    const store = createWordStore();

    await expect(preloadWords(store, queryResolving([["hello"]]))).resolves.toBe(true);
    await expect(preloadWords(store, queryResolving([["hello"]]))).resolves.toBe(false);
    await expect(preloadWords(store, queryResolving([["abc"]]))).resolves.toBe(false);
  });
});
