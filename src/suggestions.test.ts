import { describe, it, expect, beforeEach } from "vitest"
import { queryPages, queryTags, getSuggestions } from "./suggestions"

function mockDB(
  pages?: any[][],
  tags?: any[][],
) {
  ;(globalThis as any).logseq = {
    DB: {
      datascriptQuery: (query: string, ..._args: any[]) => {
        if (query.includes("block/tags")) return tags ?? []
        return pages ?? []
      },
    },
    settings: {},
  }
}

describe("queryPages", () => {
  beforeEach(() => {
    mockDB()
  })

  it("returns empty for short prefix", async () => {
    expect(await queryPages("a")).toEqual([])
  })

  it("returns scored suggestions from DB results", async () => {
    mockDB([["clojure"], ["clojurescript"]])
    const result = await queryPages("cloj")
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe("page")
    expect(result[0].text).toBe("clojure")
    expect(result[1].text).toBe("clojurescript")
  })
})

describe("queryTags", () => {
  beforeEach(() => {
    mockDB()
  })

  it("returns empty for short prefix", async () => {
    expect(await queryTags("a")).toEqual([])
  })
})

describe("getSuggestions", () => {
  beforeEach(() => {
    mockDB()
  })

  it("returns empty array when no matches", async () => {
    const result = await getSuggestions("xyz")
    expect(result).toEqual([])
  })

  it("returns ranked and deduplicated results", async () => {
    mockDB([["hello"]])
    const result = await getSuggestions("hel")
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((s: any) => s.score > 0)).toBe(true)
  })
})
