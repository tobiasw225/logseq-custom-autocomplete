import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSessionFrequency,
  learnFromBlockContent,
  loadSessionWords,
  preloadSessionWords,
  resetSessionWords,
  saveSessionWords,
  searchSessionWords,
} from "./session";

function setSettings(overrides: Record<string, unknown> = {}) {
  const mutableSettings: Record<string, unknown> = {
    sessionDictionary: "",
    ...overrides,
  };
  (globalThis as any).logseq = {
    ...((globalThis as any).logseq ?? {}),
    settings: mutableSettings,
    updateSettings: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(mutableSettings, patch);
    }),
  };
  return mutableSettings;
}

function mockDB(rows: Array<[string]> = []) {
  const current = (globalThis as any).logseq;
  if (current) {
    current.DB = {
      datascriptQuery: vi.fn().mockResolvedValue(rows),
    };
  }
}

beforeEach(() => {
  resetSessionWords();
  setSettings();
});

afterEach(() => {
  resetSessionWords();
  vi.useRealTimers();
  delete (globalThis as any).logseq;
});

describe("session facade", () => {
  it("learns words and exposes search plus frequency", () => {
    learnFromBlockContent("hello world", null);
    learnFromBlockContent("hello", null);
    learnFromBlockContent("hello again", "hello");

    expect(searchSessionWords("he")).toContain("hello");
    expect(searchSessionWords("wo")).toContain("world");
    expect(getSessionFrequency("hello")).toBe(2);
  });

  it("clears words on reset", () => {
    learnFromBlockContent("hello world", null);
    resetSessionWords();
    expect(searchSessionWords("he")).toEqual([]);
  });

  it("schedules persistence after learning", () => {
    vi.useFakeTimers();
    const settings = setSettings();
    const updateSettings = (globalThis as any).logseq.updateSettings;

    learnFromBlockContent("hello", null);
    expect(updateSettings).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expectationPersisted(settings, "hello", 1);
  });

  it("cancels a pending persist on reset", () => {
    vi.useFakeTimers();
    setSettings();
    const updateSettings = (globalThis as any).logseq.updateSettings;

    learnFromBlockContent("hello", null);
    resetSessionWords();
    vi.advanceTimersByTime(2000);

    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("saves the current words via updateSettings", () => {
    const settings = setSettings();
    learnFromBlockContent("hello world", null);
    learnFromBlockContent("hello", null);

    saveSessionWords();

    expectationPersisted(settings, "hello", 2);
    expectationPersisted(settings, "world", 1);
  });

  it("loads words from settings JSON", () => {
    setSettings({ sessionDictionary: '[["hello",3],["world",1]]' });

    loadSessionWords();

    expect(searchSessionWords("he")).toContain("hello");
    expect(getSessionFrequency("hello")).toBe(3);
  });

  it("round-trips learn, save, reset, load", () => {
    const settings = setSettings();
    learnFromBlockContent("persist test word", null);
    learnFromBlockContent("persist", null);
    saveSessionWords();

    resetSessionWords();
    expect(searchSessionWords("per")).toEqual([]);

    (globalThis as any).logseq.settings = settings;
    loadSessionWords();

    expect(searchSessionWords("per")).toContain("persist");
    expect(getSessionFrequency("persist")).toBe(2);
  });
});

describe("preloadSessionWords wiring", () => {
  it("preloads words from datascript and persists immediately", async () => {
    const settings = setSettings();
    mockDB([["hello world"]]);

    await preloadSessionWords();

    expect(searchSessionWords("hel")).toContain("hello");
    expectationPersisted(settings, "hello", 1);
  });

  it("does nothing when logseq.DB is unavailable", async () => {
    setSettings();
    delete (globalThis as any).logseq.DB;

    await expect(preloadSessionWords()).resolves.toBeUndefined();
    expect(searchSessionWords("he")).toEqual([]);
  });

  it("swallows datascript query failures", async () => {
    setSettings();
    (globalThis as any).logseq.DB = {
      datascriptQuery: vi.fn().mockRejectedValue(new Error("query failed")),
    };

    await expect(preloadSessionWords()).resolves.toBeUndefined();
    expect(searchSessionWords("he")).toEqual([]);
  });
});

function expectationPersisted(settings: Record<string, unknown>, word: string, frequency: number) {
  const raw = settings.sessionDictionary as string;
  const parsed: Array<[string, number]> = JSON.parse(raw);
  expect(parsed).toContainEqual([word, frequency]);
}
