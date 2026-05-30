import { describe, it, expect, beforeEach } from "vitest"
import { searchWords, loadWords } from "./dictionary"

function setSettings(value: string) {
  ;(globalThis as any).logseq = {
    settings: { customDictionary: value },
  }
}

describe("dictionary", () => {
  beforeEach(() => {
    setSettings("")
  })

  describe("loadWords", () => {
    it("returns an empty array for empty settings", () => {
      setSettings("")
      expect(loadWords()).toEqual([])
    })

    it("parses comma-separated words", () => {
      setSettings("foo, bar, baz")
      expect(loadWords()).toEqual(["foo", "bar", "baz"])
    })

    it("trims whitespace", () => {
      setSettings("  foo , bar  ")
      expect(loadWords()).toEqual(["foo", "bar"])
    })

    it("filters empty entries", () => {
      setSettings("foo,,bar,,")
      expect(loadWords()).toEqual(["foo", "bar"])
    })
  })

  describe("searchWords", () => {
    it("returns matching words by prefix", () => {
      setSettings("apple, application, banana")
      expect(searchWords("app")).toEqual(["apple", "application"])
    })

    it("is case-insensitive", () => {
      setSettings("Apple, BANANA")
      expect(searchWords("app")).toEqual(["Apple"])
      expect(searchWords("ban")).toEqual(["BANANA"])
    })

    it("returns empty for short prefix", () => {
      setSettings("apple, banana")
      expect(searchWords("a")).toEqual([])
    })

    it("returns empty when no matches", () => {
      setSettings("apple, banana")
      expect(searchWords("xyz")).toEqual([])
    })
  })
})
