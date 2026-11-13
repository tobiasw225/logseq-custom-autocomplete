import { describe, expect, it, vi } from "vitest";
import { createSuggestionSession } from "./suggestion-session";
import type {
  SuggestionClock,
  SuggestionCursor,
  SuggestionEditor,
  SuggestionSession,
  SuggestionSettings,
  SuggestionUI,
} from "./suggestion-session";
import type { Suggestion } from "./utils";

const BLOCK = { uuid: "block-uuid", content: "Blau" };
const CURSOR: SuggestionCursor = { pos: 4, rect: { left: 10, top: 20, height: 24 } };
const SHOW_Y = 20 + 24 + 4;

function suggestion(text: string): Suggestion {
  return { text, type: "dictionary", score: 100 };
}

interface FakeClock extends SuggestionClock {
  advance(ms: number): void;
  pendingCount(): number;
  delays(): number[];
}

function createClock(start = 1000): FakeClock {
  let current = start;
  let nextId = 1;
  const scheduled: Array<{ id: number; at: number; run: () => void }> = [];
  const recordedDelays: number[] = [];

  return {
    now: () => current,
    setTimeout(run, delay) {
      const id = nextId++;
      scheduled.push({ id, at: current + delay, run });
      recordedDelays.push(delay);
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout(timer) {
      const id = timer as unknown as number;
      const index = scheduled.findIndex((entry) => entry.id === id);
      if (index !== -1) scheduled.splice(index, 1);
    },
    advance(ms) {
      current += ms;
      const due = scheduled.filter((entry) => entry.at <= current).sort((a, b) => a.at - b.at);
      for (const entry of due) {
        const index = scheduled.indexOf(entry);
        if (index === -1) continue;
        scheduled.splice(index, 1);
        entry.run();
      }
    },
    pendingCount: () => scheduled.length,
    delays: () => recordedDelays,
  };
}

function createUI(initialSuggestions: Suggestion[] = []): SuggestionUI {
  let suggestions = initialSuggestions;
  let visible = initialSuggestions.length > 0;

  return {
    isVisible: vi.fn(() => visible),
    show: vi.fn((next: Suggestion[]) => {
      suggestions = next;
      visible = true;
    }),
    hide: vi.fn(() => {
      suggestions = [];
      visible = false;
    }),
    getCurrentSuggestions: vi.fn(() => suggestions),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

interface SetupOptions {
  editor?: Partial<SuggestionEditor>;
  ui?: SuggestionUI;
  settings?: Record<string, unknown>;
  query?: (prefix: string) => Suggestion[];
  clock?: FakeClock;
}

interface Setup {
  session: SuggestionSession;
  editor: SuggestionEditor & {
    getCurrentBlock: any;
    getEditingCursorPosition: any;
    updateBlock: any;
  };
  ui: SuggestionUI & {
    isVisible: any;
    show: any;
    hide: any;
    getCurrentSuggestions: any;
  };
  settings: SuggestionSettings & { read: any };
  clock: FakeClock;
  query: any;
  learn: any;
}

function setup(options: SetupOptions = {}): Setup {
  const editor = {
    getCurrentBlock: vi.fn().mockResolvedValue(BLOCK),
    getEditingCursorPosition: vi.fn().mockResolvedValue(CURSOR),
    updateBlock: vi.fn().mockResolvedValue(undefined),
    ...options.editor,
  } as unknown as Setup["editor"];

  const ui = (options.ui ?? createUI()) as Setup["ui"];
  const settings = { read: vi.fn((key: string) => options.settings?.[key]) };
  const clock = options.clock ?? createClock();
  const query = vi.fn(options.query ?? (() => [] as Suggestion[]));
  const learn = vi.fn();

  const session = createSuggestionSession({ editor, ui, settings, clock, query, learn });

  return { session, editor, ui, settings, clock, query, learn };
}

describe("onContentChanged", () => {
  it("queries after the debounce delay and shows the suggestions at the cursor", async () => {
    const suggestions = [suggestion("blaupause")];
    const { session, ui, clock, query } = setup({
      settings: { suggestionDebounceDelay: 80 },
      query: () => suggestions,
    });

    await session.onContentChanged();

    expect(query).not.toHaveBeenCalled();
    clock.advance(79);
    expect(query).not.toHaveBeenCalled();
    clock.advance(1);

    expect(query).toHaveBeenCalledWith("Blau");
    expect(ui.show).toHaveBeenCalledWith(suggestions, 10, SHOW_Y, "Blau");
    expect(clock.delays()).toContain(80);
  });

  it("learns the block content with the word at the cursor", async () => {
    const { session, learn } = setup({ query: () => [] });

    await session.onContentChanged();

    expect(learn).toHaveBeenCalledWith("Blau", "Blau");
  });

  it("does not query again for the same prefix while the dropdown is visible", async () => {
    const { session, ui, clock, query } = setup({
      settings: { suggestionDebounceDelay: 80 },
      query: () => [suggestion("blaupause")],
    });

    await session.onContentChanged();
    clock.advance(80);

    clock.advance(80);
    await session.onContentChanged();
    clock.advance(80);

    expect(query).toHaveBeenCalledTimes(1);
    expect(ui.show).toHaveBeenCalledTimes(1);
  });

  it("throttles content changes within the minimum interval", async () => {
    const { session, editor } = setup({ settings: { minInterval: 100 } });

    await session.onContentChanged();
    await session.onContentChanged();

    expect(editor.getCurrentBlock).toHaveBeenCalledTimes(1);
  });

  it("continues after the minimum interval has elapsed", async () => {
    const clock = createClock(1000);
    const { session, editor } = setup({ settings: { minInterval: 100 }, clock });

    await session.onContentChanged();
    clock.advance(100);
    await session.onContentChanged();

    expect(editor.getCurrentBlock).toHaveBeenCalledTimes(2);
  });

  it("guards reentrancy while a read is in flight", async () => {
    const pending = deferred<typeof BLOCK>();
    const getCurrentBlock = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(BLOCK);
    const { session, editor } = setup({ editor: { getCurrentBlock } });

    const first = session.onContentChanged();
    await session.onContentChanged();

    expect(editor.getCurrentBlock).toHaveBeenCalledTimes(1);

    pending.resolve(BLOCK);
    await first;
  });

  it("hides inside an ignored context", async () => {
    const ui = createUI([suggestion("old")]);
    const { session, clock, query } = setup({
      ui,
      editor: {
        getCurrentBlock: vi.fn().mockResolvedValue({ uuid: "block-uuid", content: "https://exa" }),
        getEditingCursorPosition: vi.fn().mockResolvedValue({ pos: 11, rect: CURSOR.rect }),
      },
    });

    await session.onContentChanged();
    clock.advance(80);

    expect(ui.hide).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
  });

  it("hides when the cursor is followed by a non-word character", async () => {
    const ui = createUI([suggestion("old")]);
    const { session, query, learn } = setup({
      ui,
      editor: {
        getCurrentBlock: vi.fn().mockResolvedValue({ uuid: "block-uuid", content: "abc def" }),
        getEditingCursorPosition: vi.fn().mockResolvedValue({ pos: 3, rect: CURSOR.rect }),
      },
    });

    await session.onContentChanged();

    expect(ui.hide).toHaveBeenCalledTimes(1);
    expect(learn).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("learns but then hides when there is no word at the cursor", async () => {
    const ui = createUI([suggestion("old")]);
    const { session, query, learn } = setup({
      ui,
      editor: {
        getCurrentBlock: vi.fn().mockResolvedValue({ uuid: "block-uuid", content: "abc " }),
        getEditingCursorPosition: vi.fn().mockResolvedValue({ pos: 4, rect: CURSOR.rect }),
      },
    });

    await session.onContentChanged();

    expect(learn).toHaveBeenCalledWith("abc ", null);
    expect(ui.hide).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
  });

  it("hides when the query returns no suggestions", async () => {
    const ui = createUI([suggestion("old")]);
    const { session, clock } = setup({ ui, query: () => [] });

    await session.onContentChanged();
    clock.advance(80);

    expect(ui.hide).toHaveBeenCalledTimes(1);
    expect(ui.show).not.toHaveBeenCalled();
  });

  it("auto-expands a unique suggestion when enabled", async () => {
    const { session, editor, clock, ui } = setup({
      settings: { autoExpandOnUnique: true, suggestionDebounceDelay: 80 },
      query: () => [suggestion("blaupause")],
    });

    await session.onContentChanged();
    clock.advance(80);
    await flush();

    expect(editor.updateBlock).toHaveBeenCalledWith("block-uuid", "Blaupause");
    expect(ui.show).not.toHaveBeenCalled();
  });

  it("does not auto-expand when the setting is off", async () => {
    const { session, editor, clock, ui } = setup({
      settings: { autoExpandOnUnique: false, suggestionDebounceDelay: 80 },
      query: () => [suggestion("blaupause")],
    });

    await session.onContentChanged();
    clock.advance(80);
    await flush();

    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(ui.show).toHaveBeenCalledTimes(1);
  });

  it("does not auto-expand when there are multiple suggestions", async () => {
    const { session, editor, clock, ui } = setup({
      settings: { autoExpandOnUnique: true, suggestionDebounceDelay: 80 },
      query: () => [suggestion("buch"), suggestion("budget")],
    });

    await session.onContentChanged();
    clock.advance(80);
    await flush();

    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(ui.show).toHaveBeenCalledTimes(1);
  });

  it("shows instead of writing when the word changed before auto-expand", async () => {
    const getCurrentBlock = vi
      .fn()
      .mockResolvedValueOnce({ uuid: "block-uuid", content: "bux" })
      .mockResolvedValueOnce({ uuid: "block-uuid", content: "buxy" });
    const getEditingCursorPosition = vi
      .fn()
      .mockResolvedValueOnce({ pos: 3, rect: CURSOR.rect })
      .mockResolvedValueOnce({ pos: 4, rect: CURSOR.rect });

    const { session, editor, clock, ui } = setup({
      editor: { getCurrentBlock, getEditingCursorPosition },
      settings: { autoExpandOnUnique: true, suggestionDebounceDelay: 80 },
      query: () => [suggestion("buch")],
    });

    await session.onContentChanged();
    clock.advance(80);
    await flush();

    expect(editor.updateBlock).not.toHaveBeenCalled();
    expect(ui.show).toHaveBeenCalledTimes(1);
  });
});

describe("accept", () => {
  it("does nothing when the dropdown is hidden", async () => {
    const { session, editor } = setup();

    const accepted = await session.accept();

    expect(accepted).toBe(false);
    expect(editor.updateBlock).not.toHaveBeenCalled();
  });

  it("inserts a single suggestion in full", async () => {
    const ui = createUI([suggestion("blaupause")]);
    const { session, editor } = setup({ ui });

    const accepted = await session.accept();

    expect(accepted).toBe(true);
    expect(editor.updateBlock).toHaveBeenCalledWith("block-uuid", "Blaupause");
  });

  it("inserts the common prefix for multiple suggestions", async () => {
    const ui = createUI([suggestion("blauwal"), suggestion("blaupause")]);
    const { session, editor } = setup({
      ui,
      editor: {
        getCurrentBlock: vi.fn().mockResolvedValue({ uuid: "block-uuid", content: "bl" }),
        getEditingCursorPosition: vi.fn().mockResolvedValue({ pos: 2, rect: CURSOR.rect }),
      },
    });

    const accepted = await session.accept();

    expect(accepted).toBe(true);
    expect(editor.updateBlock).toHaveBeenCalledWith("block-uuid", "blau");
  });
});

describe("dismiss", () => {
  it("cancels a pending query and hides the dropdown", async () => {
    const ui = createUI([suggestion("old")]);
    const { session, clock, query } = setup({
      ui,
      settings: { suggestionDebounceDelay: 80 },
      query: () => [suggestion("blaupause")],
    });

    await session.onContentChanged();
    expect(clock.pendingCount()).toBe(1);

    session.dismiss();
    clock.advance(80);

    expect(ui.hide).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    expect(clock.pendingCount()).toBe(0);
  });
});

describe("dispose", () => {
  it("cancels a pending query", async () => {
    const { session, clock, query } = setup({
      settings: { suggestionDebounceDelay: 80 },
      query: () => [suggestion("blaupause")],
    });

    await session.onContentChanged();
    session.dispose();
    clock.advance(80);

    expect(query).not.toHaveBeenCalled();
  });
});
