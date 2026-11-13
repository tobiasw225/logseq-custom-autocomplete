// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@logseq/libs", () => ({}));

const mockOnContentChanged = vi.fn().mockResolvedValue(undefined);
const mockAccept = vi.fn().mockResolvedValue(true);
const mockDismiss = vi.fn();
const mockDispose = vi.fn();
let createdSessionDeps: Record<string, unknown> | undefined;
const mockCreateSuggestionSession = vi.fn((deps: Record<string, unknown>) => {
  createdSessionDeps = deps;
  return {
    onContentChanged: mockOnContentChanged,
    accept: mockAccept,
    dismiss: mockDismiss,
    dispose: mockDispose,
  };
});
vi.mock("./suggestion-session", () => ({
  createSuggestionSession: mockCreateSuggestionSession,
}));

const mockInitUI = vi.fn();
const mockShow = vi.fn();
const mockHide = vi.fn();
const mockIsVisible = vi.fn(() => false);
const mockSelectNext = vi.fn();
const mockSelectPrev = vi.fn();
const mockGetCurrentSuggestions = vi.fn(() => []);
vi.mock("./ui-host", () => ({
  init: mockInitUI,
  show: mockShow,
  hide: mockHide,
  isVisible: mockIsVisible,
  selectNext: mockSelectNext,
  selectPrev: mockSelectPrev,
  getCurrentSuggestions: mockGetCurrentSuggestions,
}));

const mockGetSuggestions = vi.fn(() => []);
vi.mock("./suggestions", () => ({
  getSuggestions: mockGetSuggestions,
}));

const mockLearnFromBlockContent = vi.fn();
const mockLoadSessionWords = vi.fn();
const mockPreloadSessionWords = vi.fn().mockResolvedValue(undefined);
vi.mock("./session", () => ({
  learnFromBlockContent: mockLearnFromBlockContent,
  loadSessionWords: mockLoadSessionWords,
  preloadSessionWords: mockPreloadSessionWords,
}));

let readyCallback: (() => void) | undefined;

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
    ready: vi.fn((callback: () => void) => {
      readyCallback = callback;
      return { catch: vi.fn() };
    }),
    UI: { showMsg: vi.fn() },
  };
  (globalThis as any).logseq = impl;
  return impl;
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockAccept.mockResolvedValue(true);
  mockPreloadSessionWords.mockResolvedValue(undefined);
  mockIsVisible.mockReturnValue(false);
  mockGetCurrentSuggestions.mockReturnValue([]);
  createMockLogseq();
  await import("./main");
});

afterEach(() => {
  delete (globalThis as any).logseq;
  vi.restoreAllMocks();
});

describe("session wiring", () => {
  it("checkAndSuggest delegates to the session", async () => {
    const { checkAndSuggest } = await import("./main");

    await checkAndSuggest();

    expect(mockOnContentChanged).toHaveBeenCalledTimes(1);
  });

  it("confirmSuggestion delegates to the session", async () => {
    const { confirmSuggestion } = await import("./main");

    await confirmSuggestion();

    expect(mockAccept).toHaveBeenCalledTimes(1);
  });

  it("creates the session with editor, ui, settings, clock, query and learn ports", () => {
    expect(Object.keys(createdSessionDeps ?? {}).sort()).toEqual([
      "clock",
      "editor",
      "learn",
      "query",
      "settings",
      "ui",
    ]);
  });
});

describe("main", () => {
  it("initializes the UI, loads persisted words and preloads", () => {
    readyCallback?.();

    const logseq = (globalThis as any).logseq;
    expect(mockInitUI).toHaveBeenCalledTimes(1);
    expect(mockLoadSessionWords).toHaveBeenCalledTimes(1);
    expect(mockPreloadSessionWords).toHaveBeenCalledTimes(1);
    expect(logseq.useSettingsSchema).toHaveBeenCalledTimes(1);
  });

  it("triggers a suggestion check when the current block changes", async () => {
    const logseq = (globalThis as any).logseq;
    logseq.Editor.getCurrentBlock.mockResolvedValue({ uuid: "u1" });
    readyCallback?.();

    const handler = logseq.DB.onChanged.mock.calls[0][0];
    await handler({ blocks: [{ uuid: "u1" }] });

    expect(mockOnContentChanged).toHaveBeenCalledTimes(1);
  });

  it("ignores changes to other blocks", async () => {
    const logseq = (globalThis as any).logseq;
    logseq.Editor.getCurrentBlock.mockResolvedValue({ uuid: "u1" });
    readyCallback?.();

    const handler = logseq.DB.onChanged.mock.calls[0][0];
    await handler({ blocks: [{ uuid: "other" }] });

    expect(mockOnContentChanged).not.toHaveBeenCalled();
  });

  it("registers the navigation and confirm shortcuts", () => {
    readyCallback?.();

    const logseq = (globalThis as any).logseq;
    const bindings = logseq.App.registerCommandShortcut.mock.calls.map((call: any[]) => call[0].binding);
    expect(bindings).toEqual(["alt+j", "alt+,", "ctrl+space"]);
  });

  it("navigates only while the dropdown is visible", () => {
    readyCallback?.();

    const logseq = (globalThis as any).logseq;
    const selectNextShortcut = logseq.App.registerCommandShortcut.mock.calls[0][1];

    mockIsVisible.mockReturnValue(false);
    selectNextShortcut();
    expect(mockSelectNext).not.toHaveBeenCalled();

    mockIsVisible.mockReturnValue(true);
    selectNextShortcut();
    expect(mockSelectNext).toHaveBeenCalledTimes(1);
  });

  it("confirms only while the dropdown is visible", () => {
    readyCallback?.();

    const logseq = (globalThis as any).logseq;
    const confirmShortcut = logseq.App.registerCommandShortcut.mock.calls[2][1];

    mockIsVisible.mockReturnValue(false);
    confirmShortcut();
    expect(mockAccept).not.toHaveBeenCalled();

    mockIsVisible.mockReturnValue(true);
    confirmShortcut();
    expect(mockAccept).toHaveBeenCalledTimes(1);
  });
});
