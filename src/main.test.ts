// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@logseq/libs", () => ({}));

const mockGetSuggestions = vi.fn();
vi.mock("./suggestions", () => ({
  getSuggestions: mockGetSuggestions,
}));

vi.mock("./session", () => ({
  learnFromBlockContent: vi.fn(),
  loadSessionWords: vi.fn(),
  preloadSessionWords: vi.fn(),
}));

const mockShow = vi.fn();
const mockHide = vi.fn();
const mockIsVisible = vi.fn();
vi.mock("./ui-host", () => ({
  init: vi.fn(),
  show: mockShow,
  hide: mockHide,
  isVisible: mockIsVisible,
  selectNext: vi.fn(),
  selectPrev: vi.fn(),
  getSelected: vi.fn(),
}));

function createMockLogseq() {
  const impl = {
    Editor: {
      getCurrentBlock: vi.fn(),
      getEditingCursorPosition: vi.fn(),
      updateBlock: vi.fn(),
    },
    settings: {},
    provideUI: vi.fn(),
    provideStyle: vi.fn(),
    provideModel: vi.fn(),
    App: { registerCommandShortcut: vi.fn() },
    DB: { onChanged: vi.fn(), datascriptQuery: vi.fn() },
    useSettingsSchema: vi.fn(),
    updateSettings: vi.fn(),
    ready: vi.fn(() => ({ catch: vi.fn() })),
    UI: { showMsg: vi.fn() },
  };
  (globalThis as any).logseq = impl;
  return impl;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockIsVisible.mockReturnValue(false);
  createMockLogseq();
});

afterEach(() => {
  delete (globalThis as any).logseq;
  vi.restoreAllMocks();
});

describe("checkAndSuggest — auto-expand on unique match", () => {
  function setupEditor(content: string, cursorPos: number) {
    const logseq = (globalThis as any).logseq;
    logseq.Editor.getCurrentBlock.mockResolvedValue({
      uuid: "test-uuid",
      content,
    });
    logseq.Editor.getEditingCursorPosition.mockResolvedValue({
      pos: cursorPos,
      rect: { left: 100, right: 110, top: 200, bottom: 224, width: 10, height: 24 },
    });
  }

  it("auto-expands when setting is on and exactly 1 suggestion", async () => {
    vi.useFakeTimers();
    const logseq = (globalThis as any).logseq;
    logseq.settings = { autoExpandOnUnique: true };
    setupEditor("Blau", 4);
    mockGetSuggestions.mockResolvedValue([{ text: "blaupause", type: "page", score: 100 }]);

    const { checkAndSuggest } = await import("./main");
    checkAndSuggest().catch(console.error);
    await vi.advanceTimersByTimeAsync(80);

    expect(logseq.Editor.updateBlock).toHaveBeenCalledWith("test-uuid", "[[Blaupause]]");
    expect(mockShow).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does NOT auto-expand when setting is off", async () => {
    vi.useFakeTimers();
    const logseq = (globalThis as any).logseq;
    logseq.settings = { autoExpandOnUnique: false };
    setupEditor("bu", 2);
    mockGetSuggestions.mockResolvedValue([{ text: "buch", type: "page", score: 100 }]);

    const { checkAndSuggest } = await import("./main");
    checkAndSuggest().catch(console.error);
    await vi.advanceTimersByTimeAsync(80);

    expect(logseq.Editor.updateBlock).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does NOT auto-expand when setting is on but 2+ suggestions", async () => {
    vi.useFakeTimers();
    const logseq = (globalThis as any).logseq;
    logseq.settings = { autoExpandOnUnique: true };
    setupEditor("bu", 2);
    mockGetSuggestions.mockResolvedValue([
      { text: "buch", type: "page", score: 100 },
      { text: "budget", type: "page", score: 80 },
    ]);

    const { checkAndSuggest } = await import("./main");
    checkAndSuggest().catch(console.error);
    await vi.advanceTimersByTimeAsync(80);

    expect(logseq.Editor.updateBlock).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does NOT auto-expand when word changes during query", async () => {
    vi.useFakeTimers();
    const logseq = (globalThis as any).logseq;
    logseq.settings = { autoExpandOnUnique: true };
    logseq.Editor.getCurrentBlock
      .mockResolvedValueOnce({ uuid: "test-uuid", content: "bux" })
      .mockResolvedValueOnce({ uuid: "test-uuid", content: "buxy" });
    logseq.Editor.getEditingCursorPosition
      .mockResolvedValueOnce({ pos: 3, rect: { left: 100, right: 110, top: 200, bottom: 224, width: 10, height: 24 } })
      .mockResolvedValueOnce({ pos: 4, rect: { left: 100, right: 110, top: 200, bottom: 224, width: 10, height: 24 } });
    mockGetSuggestions.mockResolvedValue([{ text: "buch", type: "page", score: 100 }]);

    const { checkAndSuggest } = await import("./main");
    checkAndSuggest().catch(console.error);

    await vi.advanceTimersByTimeAsync(80);

    // Safety re-read (2nd call) finds "buxy" !== captured "bux" → falls through to show
    expect(logseq.Editor.updateBlock).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("hides when 0 suggestions and dropdown is visible", async () => {
    vi.useFakeTimers();
    mockIsVisible.mockReturnValue(true);
    setupEditor("xy", 2);
    mockGetSuggestions.mockResolvedValue([]);

    const { checkAndSuggest } = await import("./main");
    checkAndSuggest().catch(console.error);
    await vi.advanceTimersByTimeAsync(80);

    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(mockShow).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("confirmSuggestion", () => {
  it("does nothing when dropdown is not visible", async () => {
    mockIsVisible.mockReturnValue(false);

    const { confirmSuggestion } = await import("./main");
    await confirmSuggestion();

    const logseq = (globalThis as any).logseq;
    expect(logseq.Editor.updateBlock).not.toHaveBeenCalled();
  });

  it("preserves user casing when confirming a page suggestion", async () => {
    const logseq = (globalThis as any).logseq;
    logseq.Editor.getCurrentBlock.mockResolvedValue({
      uuid: "test-uuid",
      content: "Blau",
    });
    logseq.Editor.getEditingCursorPosition.mockResolvedValue({
      pos: 4,
      rect: { left: 100, right: 110, top: 200, bottom: 224, width: 10, height: 24 },
    });

    const { confirmSuggestion } = await import("./main");
    const { getSelected } = await import("./ui-host");
    vi.mocked(getSelected).mockReturnValue({
      text: "blaupause",
      type: "page",
      score: 100,
    });
    mockIsVisible.mockReturnValue(true);

    await confirmSuggestion();

    expect(logseq.Editor.updateBlock).toHaveBeenCalledWith("test-uuid", "[[Blaupause]]");
  });

  it("preserves user casing when confirming a dictionary suggestion", async () => {
    const logseq = (globalThis as any).logseq;
    logseq.Editor.getCurrentBlock.mockResolvedValue({
      uuid: "test-uuid",
      content: "Blaup",
    });
    logseq.Editor.getEditingCursorPosition.mockResolvedValue({
      pos: 5,
      rect: { left: 100, right: 110, top: 200, bottom: 224, width: 10, height: 24 },
    });

    const { confirmSuggestion } = await import("./main");
    const { getSelected } = await import("./ui-host");
    vi.mocked(getSelected).mockReturnValue({
      text: "blaupause",
      type: "dictionary",
      score: 100,
    });
    mockIsVisible.mockReturnValue(true);

    await confirmSuggestion();

    expect(logseq.Editor.updateBlock).toHaveBeenCalledWith("test-uuid", "Blaupause");
  });
});
