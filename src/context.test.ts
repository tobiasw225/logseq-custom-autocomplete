import { describe, expect, it } from "vitest";
import { isInIgnoredContext, isInsideCodeBlock, isInsideUrl } from "./context";

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
  it("returns true inside code block", () => {
    expect(isInIgnoredContext("```\ncode\n```", 8)).toBe(true);
  });

  it("returns true inside URL", () => {
    expect(isInIgnoredContext("https://example.com", 10)).toBe(true);
  });

  it("returns false for normal text", () => {
    expect(isInIgnoredContext("hello world", 4)).toBe(false);
  });

  it("returns false for wikilink (no longer ignored)", () => {
    expect(isInIgnoredContext("[[hello]]", 3)).toBe(false);
  });

  it("returns false for tag (no longer ignored)", () => {
    expect(isInIgnoredContext("#tag", 2)).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(isInIgnoredContext("", 0)).toBe(false);
  });
});
