import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_KEY, createSessionPersistence } from "./session-persistence";
import type { SessionSettingsPort } from "./session-persistence";
import { createWordStore } from "./word-store";

function createSettings(initial: Record<string, unknown> = {}) {
  const values = { ...initial };
  const write = vi.fn((patch: Record<string, unknown>) => {
    Object.assign(values, patch);
  });
  const settings: SessionSettingsPort = {
    read: (key) => values[key],
    write,
  };
  return { settings, values, write };
}

function savedEntries(values: Record<string, unknown>): Array<[string, number]> {
  return JSON.parse(values[SESSION_KEY] as string);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SessionPersistence.load", () => {
  it("restores words and frequencies from settings JSON", () => {
    const store = createWordStore();
    const { settings } = createSettings({ [SESSION_KEY]: '[["hello",3],["world",1]]' });

    createSessionPersistence(store, settings).load();

    expect(store.frequency("hello")).toBe(3);
    expect(store.frequency("world")).toBe(1);
  });

  it("ignores missing settings key", () => {
    const store = createWordStore();
    const { settings } = createSettings();

    createSessionPersistence(store, settings).load();

    expect(store.snapshot()).toEqual([]);
  });

  it("ignores empty settings value", () => {
    const store = createWordStore();
    const { settings } = createSettings({ [SESSION_KEY]: "" });

    createSessionPersistence(store, settings).load();

    expect(store.snapshot()).toEqual([]);
  });

  it("ignores non-string settings value", () => {
    const store = createWordStore();
    const { settings } = createSettings({ [SESSION_KEY]: 42 });

    createSessionPersistence(store, settings).load();

    expect(store.snapshot()).toEqual([]);
  });

  it("ignores corrupted JSON without throwing", () => {
    const store = createWordStore();
    const { settings } = createSettings({ [SESSION_KEY]: "not-json-at-all" });

    expect(() => createSessionPersistence(store, settings).load()).not.toThrow();
    expect(store.snapshot()).toEqual([]);
  });
});

describe("SessionPersistence.save", () => {
  it("serializes the store snapshot via updateSettings", () => {
    const store = createWordStore();
    store.learn("hello world", null);
    store.learn("hello", null);
    const { settings, write, values } = createSettings();

    createSessionPersistence(store, settings).save();

    expect(write).toHaveBeenCalledTimes(1);
    expect(savedEntries(values)).toContainEqual(["hello", 2]);
    expect(savedEntries(values)).toContainEqual(["world", 1]);
  });
});

describe("SessionPersistence.scheduleSave", () => {
  it("waits 2000ms before saving", () => {
    const store = createWordStore();
    store.learn("hello", null);
    const { settings, write } = createSettings();
    const persistence = createSessionPersistence(store, settings);

    persistence.scheduleSave();
    vi.advanceTimersByTime(1999);
    expect(write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on repeated calls", () => {
    const store = createWordStore();
    store.learn("hello", null);
    const { settings, write } = createSettings();
    const persistence = createSessionPersistence(store, settings);

    persistence.scheduleSave();
    vi.advanceTimersByTime(1500);
    persistence.scheduleSave();
    vi.advanceTimersByTime(1000);
    expect(write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("honors a custom delay", () => {
    const store = createWordStore();
    store.learn("hello", null);
    const { settings, write } = createSettings();
    const persistence = createSessionPersistence(store, settings, 10);

    persistence.scheduleSave();
    vi.advanceTimersByTime(10);

    expect(write).toHaveBeenCalledTimes(1);
  });
});

describe("SessionPersistence.dispose", () => {
  it("cancels a pending save", () => {
    const store = createWordStore();
    store.learn("hello", null);
    const { settings, write } = createSettings();
    const persistence = createSessionPersistence(store, settings);

    persistence.scheduleSave();
    persistence.dispose();
    vi.advanceTimersByTime(2000);

    expect(write).not.toHaveBeenCalled();
  });

  it("is safe without a pending save", () => {
    const store = createWordStore();
    const { settings, write } = createSettings();
    const persistence = createSessionPersistence(store, settings);

    expect(() => persistence.dispose()).not.toThrow();
    expect(write).not.toHaveBeenCalled();
  });
});
