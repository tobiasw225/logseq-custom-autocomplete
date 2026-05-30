import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@logseq/libs", () => ({}))

const provideModel = vi.fn()
const provideUI = vi.fn()
const provideStyle = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()

  ;(globalThis as any).logseq = {
    provideModel,
    provideUI,
    provideStyle,
    UI: { showMsg: vi.fn() },
  }

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
  } as any
})

afterEach(() => {
  delete (globalThis as any).logseq
  delete (globalThis as any).document
})

describe("init", () => {
  it("injects CSS", async () => {
    const { init } = await import("./ui-host")
    init()
    expect(provideStyle).toHaveBeenCalledTimes(1)
    expect(provideStyle.mock.calls[0][0]).toContain(".ac-dropdown")
  })
})

describe("show", () => {
  it("renders suggestion items with correct template", async () => {
    const { init, show } = await import("./ui-host")
    init()
    const suggestions = [
      { text: "Buchliste 2024", type: "page", score: 10 },
      { text: "buch", type: "tag", score: 5 },
    ]
    show(suggestions, 100, 200)

    expect(provideUI).toHaveBeenCalledTimes(1)
    const call = provideUI.mock.calls[0][0]
    expect(call.key).toBe("ac-dropdown")
    expect(call.template).toContain('data-on-click="pickSuggestion"')
    expect(call.template).toContain("Buchliste 2024")
    expect(call.template).toContain("buch")
    expect(call.style).toMatchObject({
      position: "fixed",
      left: "100px",
      top: "224px",
      zIndex: "9999",
    })
  })

  it("marks first item as selected", async () => {
    const { init, show } = await import("./ui-host")
    init()
    show([{ text: "a", type: "page", score: 1 }], 0, 0)
    const template = provideUI.mock.calls[0][0].template
    expect(template).toContain('class="ac-item selected"')
  })

  it("renders correct badges per type", async () => {
    const { init, show } = await import("./ui-host")
    init()
    show(
      [
        { text: "page", type: "page", score: 1 },
        { text: "tag", type: "tag", score: 1 },
        { text: "dict", type: "dict", score: 1 },
      ],
      0,
      0,
    )
    const template = provideUI.mock.calls[0][0].template
    expect(template).toContain(">P<")
    expect(template).toContain(">#<")
    expect(template).toContain(">D<")
  })
})

describe("getSuggestionByIndex", () => {
  it("returns suggestion at given index after show", async () => {
    const { init, show, getSuggestionByIndex } = await import("./ui-host")
    init()
    show(
      [
        { text: "a", type: "page", score: 1 },
        { text: "b", type: "tag", score: 1 },
      ],
      0,
      0,
    )
    expect(getSuggestionByIndex(0)?.text).toBe("a")
    expect(getSuggestionByIndex(1)?.text).toBe("b")
  })
})

describe("hide", () => {
  it("calls provideUI with null template", async () => {
    const { init, hide, show } = await import("./ui-host")
    init()
    show([{ text: "a", type: "page", score: 1 }], 0, 0)
    provideUI.mockClear()

    hide()
    expect(provideUI).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "ac-dropdown",
        template: null,
      }),
    )
  })
})

describe("keyboard navigation", () => {
  it("selectNext advances selection and re-renders", async () => {
    const { init, show, selectNext } = await import("./ui-host")
    init()
    show(
      [
        { text: "a", type: "page", score: 1 },
        { text: "b", type: "page", score: 1 },
      ],
      0,
      0,
    )
    provideUI.mockClear()

    const result = selectNext()
    expect(result?.text).toBe("b")
    expect(provideUI).toHaveBeenCalledTimes(1)
    const template = provideUI.mock.calls[0][0].template
    expect(template).toContain('data-index="1"')
    expect(template).toContain('class="ac-item selected"')
  })

  it("selectPrev goes backward", async () => {
    const { init, show, selectNext, selectPrev } = await import("./ui-host")
    init()
    show(
      [
        { text: "a", type: "page", score: 1 },
        { text: "b", type: "page", score: 1 },
      ],
      0,
      0,
    )
    provideUI.mockClear()

    selectNext()
    provideUI.mockClear()
    const result = selectPrev()
    expect(result?.text).toBe("a")
  })

  it("returns null when no suggestions", async () => {
    const { hide, selectNext, selectPrev } = await import("./ui-host")
    hide()
    expect(selectNext()).toBeNull()
    expect(selectPrev()).toBeNull()
  })
})

describe("getSelected", () => {
  it("returns currently selected suggestion", async () => {
    const { init, show, selectNext, getSelected } = await import("./ui-host")
    init()
    show(
      [
        { text: "a", type: "page", score: 1 },
        { text: "b", type: "page", score: 1 },
      ],
      0,
      0,
    )

    expect(getSelected()?.text).toBe("a")
    selectNext()
    expect(getSelected()?.text).toBe("b")
  })

  it("returns null when not visible", async () => {
    const { hide, getSelected } = await import("./ui-host")
    hide()
    expect(getSelected()).toBeNull()
  })
})
