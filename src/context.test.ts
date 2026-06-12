import { describe, expect, it } from "vitest";
import { isInIgnoredContext, isInsideCodeBlock, isInsideTag, isInsideUrl, isInsideWikilink } from "./context";

describe("isInsideWikilink", () => {
  it("returns true when cursor is inside a wikilink", () => {
    expect(isInsideWikilink("[[hello]]", 3)).toBe(true);
  });

  it("returns true for unclosed wikilink", () => {
    expect(isInsideWikilink("[[hello", 5)).toBe(true);
  });

  it("returns false when cursor is outside wikilink", () => {
    expect(isInsideWikilink("text [[link]] more", 2)).toBe(false);
  });

  it("returns false when cursor is after a closed wikilink", () => {
    expect(isInsideWikilink("[[link]] text", 10)).toBe(false);
  });

  it("returns false for plain text", () => {
    expect(isInsideWikilink("hello world", 4)).toBe(false);
  });

  it("handles multiple wikilinks", () => {
    expect(isInsideWikilink("[[a]] [[b]]", 10)).toBe(true);
  });

  it("returns false for empty content", () => {
    expect(isInsideWikilink("", 0)).toBe(false);
  });
});

describe("isInsideTag", () => {
  it("returns true when cursor is in a #tag", () => {
    expect(isInsideTag("#tag", 2)).toBe(true);
  });

  it("returns true when cursor is at start of tag word", () => {
    expect(isInsideTag("#tag", 1)).toBe(true);
  });

  it("returns true for tag in the middle of text", () => {
    expect(isInsideTag("text #tag more", 8)).toBe(true);
  });

  it("returns false for escaped hash ##tag", () => {
    expect(isInsideTag("##tag", 3)).toBe(false);
  });

  it("returns false for plain text without #", () => {
    expect(isInsideTag("hello", 2)).toBe(false);
  });

  it("returns false when # is attached to text (not a valid tag)", () => {
    expect(isInsideTag("text#tag", 7)).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(isInsideTag("", 0)).toBe(false);
  });
});

describe("isInsideCodeBlock", () => {
  it("returns true when cursor is inside a code block", () => {
    expect(isInsideCodeBlock("```\ncode\n```", 8)).toBe(true);
  });

  it("returns true for unclosed code block", () => {
    expect(isInsideCodeBlock("```\ncode", 7)).toBe(true);
  });

  it("returns false when cursor is before the code block", () => {
    expect(isInsideCodeBlock("text\n```\ncode\n```", 2)).toBe(false);
  });

  it("returns false when cursor is outside (no code block)", () => {
    expect(isInsideCodeBlock("hello world", 4)).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(isInsideCodeBlock("", 0)).toBe(false);
  });

  it("handles multiple code blocks", () => {
    expect(isInsideCodeBlock("```\na\n```\n\n```\nb", 16)).toBe(true);
  });
});

describe("isInsideUrl", () => {
  it("returns true when cursor is inside a URL", () => {
    expect(isInsideUrl("https://example.com", 10)).toBe(true);
  });

  it("returns true when cursor is after :// in URL", () => {
    expect(isInsideUrl("https://example.com", 8)).toBe(true);
  });

  it("returns true for URL in text", () => {
    expect(isInsideUrl("visit https://example.com now", 14)).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isInsideUrl("hello world", 4)).toBe(false);
  });

  it("returns false for :// without scheme letter", () => {
    expect(isInsideUrl("1://test", 5)).toBe(false);
  });

  it("returns false for :// alone", () => {
    expect(isInsideUrl(":// not a url", 5)).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(isInsideUrl("", 0)).toBe(false);
  });
});

describe("isInIgnoredContext", () => {
  it("returns true inside wikilink", () => {
    expect(isInIgnoredContext("[[hello]]", 3)).toBe(true);
  });

  it("returns true inside tag", () => {
    expect(isInIgnoredContext("#tag", 2)).toBe(true);
  });

  it("returns true inside code block", () => {
    expect(isInIgnoredContext("```\ncode\n```", 8)).toBe(true);
  });

  it("returns true inside URL", () => {
    expect(isInIgnoredContext("https://example.com", 10)).toBe(true);
  });

  it("returns false for normal text", () => {
    expect(isInIgnoredContext("hello world", 4)).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(isInIgnoredContext("", 0)).toBe(false);
  });
});
