import "@logseq/libs"
import type { Suggestion } from "./utils"

const UI_KEY = "ac-dropdown"

let currentSuggestions: Suggestion[] = []
let selectedIndex = 0
let visible = false
let posX = 0
let posY = 0

export function isVisible(): boolean {
  return visible
}

export function show(suggestions: Suggestion[], x: number, y: number): void {
  currentSuggestions = suggestions
  selectedIndex = 0
  visible = true
  posX = x
  posY = y
  render()
}

export function hide(): void {
  visible = false
  currentSuggestions = []
  selectedIndex = 0
  logseq.provideUI({
    key: UI_KEY,
    template: null,
    reset: true,
    replace: true,
  })
}

export function selectNext(): Suggestion | null {
  if (!visible || currentSuggestions.length === 0) return null
  selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1)
  render()
  return currentSuggestions[selectedIndex]
}

export function selectPrev(): Suggestion | null {
  if (!visible || currentSuggestions.length === 0) return null
  selectedIndex = Math.max(selectedIndex - 1, 0)
  render()
  return currentSuggestions[selectedIndex]
}

export function getSelected(): Suggestion | null {
  if (!visible || currentSuggestions.length === 0) return null
  return currentSuggestions[selectedIndex] ?? null
}

export function getSuggestionByIndex(index: number): Suggestion | undefined {
  return currentSuggestions[index]
}

function render(): void {
  if (!visible) return

  const itemsHtml = currentSuggestions
    .map(
      (s, i) =>
        `<div data-index="${i}" data-on-click="pickSuggestion" class="${i === selectedIndex ? "ac-item selected" : "ac-item"}">` +
        `<span class="ac-badge">${badge(s.type)}</span> ${escapeHtml(s.text)}</div>`,
    )
    .join("")

  logseq.provideUI({
    key: UI_KEY,
    template: `<div class="ac-dropdown">${itemsHtml}</div>`,
    style: {
      position: "fixed",
      left: `${posX}px`,
      top: `${posY + 24}px`,
      zIndex: "9999",
    },
  })
}

function badge(type: Suggestion["type"]): string {
  if (type === "page") return "P"
  if (type === "tag") return "#"
  return "D"
}

function escapeHtml(text: string): string {
  const d = document.createElement("div")
  d.textContent = text
  return d.innerHTML
}

export function init(): void {
  logseq.provideStyle(`
.ac-dropdown {
  background: var(--ls-primary-background-color, #fff);
  color: var(--ls-primary-text-color, #333);
  border: 1px solid var(--ls-border-color, #ddd);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-height: 240px;
  overflow-y: auto;
  min-width: 180px;
  padding: 4px 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
}
.ac-item {
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ac-item:hover,
.ac-item.selected {
  background: var(--ls-secondary-background-color, #f0f0f0);
}
.ac-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  background: var(--ls-tag-background-color, #e8e8e8);
  color: var(--ls-tag-text-color, #666);
}
  `)
}
