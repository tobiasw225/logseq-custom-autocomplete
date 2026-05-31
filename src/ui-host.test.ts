// @vitest-environment happy-dom
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
})

afterEach(() => {
  delete (globalThis as any).logseq
  vi.restoreAllMocks()
})

afterEach(() => {
  delete (globalThis as any).logseq
  vi.restoreAllMocks()
})

describe("init", () => {
  it("injects CSS", async () => {
    const { init } = await import("./ui-host")
    init()
    expect(provideStyle).toHaveBeenCalledTimes(1)
    expect(provideStyle.mock.calls[0][0]).toContain('[id$="--ac-dropdown"]')
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
    expect(call.template).toContain("Buchliste 2024")
    expect(call.template).toContain("buch")
    expect(call.style).toMatchObject({
      position: "fixed",
      left: "100px",
      top: "200px",
      zIndex: "9999",
    })
    expect(call.close).toBe("outside")
    expect(call.replace).toBe(true)
  })

  it("marks first item as selected", async () => {
    const { init, show } = await import("./ui-host")
    init()
    show([{ text: "a", type: "page", score: 1 }], 0, 0)
    const template = provideUI.mock.calls[0][0].template
    expect(template).toContain('class="ac-item selected"')
  })

  it("hides the draggable and resizable handles Logseq adds to floating containers", async () => {
    const dragHandle = document.createElement("div")
    dragHandle.className = "draggable-handle"
    const resizeHandle = document.createElement("div")
    resizeHandle.className = "resizable-handle"
    const content = document.createElement("div")
    content.className = "ls-ui-float-content"
    const dropdown = document.createElement("div")
    dropdown.className = "ac-dropdown"
    content.append(dropdown)
    const container = document.createElement("div")
    container.id = "logseq-autocomplete--ac-dropdown"
    container.className = "lsp-ui-float-container visible"
    container.append(dragHandle, resizeHandle, content)
    document.body.append(container)

    const { init, show } = await import("./ui-host")
    init()
    show([{ text: "test", type: "page", score: 1 }], 100, 200)

    expect(dragHandle.style.display).toBe("none")
    expect(resizeHandle.style.display).toBe("none")
    expect(container.style.pointerEvents).toBe("none")
    expect(content.style.pointerEvents).toBe("auto")
    expect(container.getAttribute("draggable")).toBeNull()
    expect(container.getAttribute("resizable")).toBeNull()
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

describe("Escape dismissal", () => {
  it("hides the dropdown on Escape keydown", async () => {
    const { init, show, isVisible } = await import("./ui-host")
    init()
    show([{ text: "test", type: "page", score: 1 }], 100, 200)
    expect(isVisible()).toBe(true)

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(isVisible()).toBe(false)
  })

  it("ignores Escape when already hidden", async () => {
    const { init, hide, isVisible } = await import("./ui-host")
    init()
    hide()
    expect(isVisible()).toBe(false)

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(isVisible()).toBe(false)
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
