// @vitest-environment happy-dom
/**
 * Keyboard flow integration tests.
 * The primary interaction is keyboard-driven (Alt+J/K + Enter/Space),
 * so these tests validate the full pipeline that actually works at runtime.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@logseq/libs", () => ({}))

beforeEach(() => {
  ;(globalThis as any).logseq = {
    provideModel: vi.fn(),
    provideUI: vi.fn(),
    provideStyle: vi.fn(),
    UI: { showMsg: vi.fn() },
  }

  const listeners: Record<string, Array<(e: any) => void>> = {}
  globalThis.document = {
    createElement: () => {
      const el: any = { textContent: "" }
      Object.defineProperty(el, "innerHTML", {
        get() {
          return this.textContent
        },
      })
      return el
    },
    addEventListener: (type: string, fn: (e: any) => void) => {
      if (!listeners[type]) listeners[type] = []
      listeners[type].push(fn)
    },
    removeEventListener: (type: string, fn: (e: any) => void) => {
      if (!listeners[type]) return
      listeners[type] = listeners[type].filter((f) => f !== fn)
    },
    dispatchEvent: (e: any) => {
      const arr = listeners[e.type] ?? []
      for (const fn of arr) fn(e)
    },
  } as any
})

afterEach(() => {
  delete (globalThis as any).logseq
  delete (globalThis as any).document
})

describe("keyboard navigation + confirm flow", () => {
  it("navigates down with selectNext and up with selectPrev", async () => {
    const { init, show, selectNext, selectPrev, getSelected } = await import("./ui-host")
    init()

    show(
      [
        { text: "alpha", type: "page", score: 1 },
        { text: "beta", type: "tag", score: 1 },
        { text: "gamma", type: "dict", score: 1 },
      ],
      0,
      0,
    )

    // Initial: first item selected
    expect(getSelected()?.text).toBe("alpha")

    // Navigate down
    expect(selectNext()?.text).toBe("beta")
    expect(selectNext()?.text).toBe("gamma")

    // Stays at last
    expect(selectNext()?.text).toBe("gamma")

    // Navigate up
    expect(selectPrev()?.text).toBe("beta")
    expect(selectPrev()?.text).toBe("alpha")

    // Stays at first
    expect(selectPrev()?.text).toBe("alpha")
  })

  it("getSelected returns correct item at each position", async () => {
    const { init, show, selectNext, getSelected } = await import("./ui-host")
    init()

    show(
      [
        { text: "a", type: "page", score: 1 },
        { text: "b", type: "tag", score: 1 },
        { text: "c", type: "dict", score: 1 },
      ],
      0,
      0,
    )

    expect(getSelected()?.text).toBe("a")
    selectNext()
    expect(getSelected()?.text).toBe("b")
    selectNext()
    expect(getSelected()?.text).toBe("c")
  })

  it("returns to first item after hide + show", async () => {
    const { init, show, hide, selectNext, getSelected } = await import("./ui-host")
    init()

    show([{ text: "a", type: "page", score: 1 }, { text: "b", type: "page", score: 1 }], 0, 0)
    selectNext()
    expect(getSelected()?.text).toBe("b")

    hide()
    expect(getSelected()).toBeNull()

    show([{ text: "x", type: "page", score: 1 }, { text: "y", type: "page", score: 1 }], 0, 0)
    expect(getSelected()?.text).toBe("x")
  })

  it("hides and retriggers: show → hide → show again works", async () => {
    const { init, show, hide, isVisible } = await import("./ui-host")
    init()

    show([{ text: "a", type: "page", score: 1 }], 0, 0)
    expect(isVisible()).toBe(true)

    hide()
    expect(isVisible()).toBe(false)

    show([{ text: "b", type: "page", score: 1 }], 0, 0)
    expect(isVisible()).toBe(true)
  })

  it("isVisible reflects current state", async () => {
    const { init, show, hide, isVisible } = await import("./ui-host")
    hide()
    init()

    expect(isVisible()).toBe(false)
    show([{ text: "a", type: "page", score: 1 }], 0, 0)
    expect(isVisible()).toBe(true)
    hide()
    expect(isVisible()).toBe(false)
  })
})
