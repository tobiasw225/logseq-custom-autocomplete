import "@logseq/libs";
import type { Suggestion } from "./utils";

const UI_KEY = "ac-dropdown";

const MAX_VISIBLE = 4;

let currentSuggestions: Suggestion[] = [];
let selectedIndex = 0;
let visible = false;
let hasMore = false;
let posX = 0;
let posY = 0;
let currentPrefix = "";
let confirmCallback: (() => void) | null = null;
let lastFocusedEditor: HTMLElement | null = null;

export function isVisible(): boolean {
  return visible;
}

export function show(suggestions: Suggestion[], x: number, y: number, prefix: string): void {
  currentSuggestions = suggestions.slice(0, MAX_VISIBLE);
  hasMore = suggestions.length > MAX_VISIBLE;
  selectedIndex = 0;
  visible = true;
  posX = x;
  posY = y;
  currentPrefix = prefix;
  try {
    const d = window.parent?.document;
    if (d) lastFocusedEditor = d.activeElement as HTMLElement | null;
  } catch {
    /* cross-origin */
  }
  render();
}

export function hide(): void {
  visible = false;
  currentSuggestions = [];
  hasMore = false;
  selectedIndex = 0;
  currentPrefix = "";
  logseq.provideUI({
    key: UI_KEY,
    template: null,
    reset: true,
    replace: true,
  });
  const el = lastFocusedEditor;
  lastFocusedEditor = null;
  if (el) {
    setTimeout(() => {
      try {
        el.focus();
      } catch {
        /* stale element */
      }
    }, 0);
  }
}

export function selectNext(): Suggestion | null {
  if (!visible || currentSuggestions.length === 0) return null;
  selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
  render();
  return currentSuggestions[selectedIndex];
}

export function selectPrev(): Suggestion | null {
  if (!visible || currentSuggestions.length === 0) return null;
  selectedIndex = Math.max(selectedIndex - 1, 0);
  render();
  return currentSuggestions[selectedIndex];
}

export function getSelected(): Suggestion | null {
  if (!visible || currentSuggestions.length === 0) return null;
  return currentSuggestions[selectedIndex] ?? null;
}

export function getCurrentSuggestions(): Suggestion[] {
  return currentSuggestions;
}

export function getSelectedIndex(): number {
  return selectedIndex;
}

function render(): void {
  if (!visible) return;

  const lowerPrefix = currentPrefix.toLowerCase();
  const itemsHtml = currentSuggestions
    .map((s, i) => {
      const lowerSugg = s.text.toLowerCase();
      const suffix = lowerSugg.startsWith(lowerPrefix) ? s.text.slice(lowerPrefix.length) : s.text;
      const typeLabel = s.type === "page" ? " (p)" : s.type === "tag" ? " (t)" : "";
      const cls = i === selectedIndex ? "ac-item selected" : "ac-item";
      return `<div data-index="${i}" class="${cls}">${suffix}<span class="ac-type">${typeLabel}</span></div>`;
    })
    .join("");

  const moreHtml = hasMore ? '<div class="ac-more">…</div>' : "";

  logseq.provideUI({
    key: UI_KEY,
    template: `<div class="ac-dropdown">${itemsHtml}${moreHtml}</div>`,
    style: {
      position: "fixed",
      left: `${posX}px`,
      top: `${posY}px`,
      zIndex: "9999",
    },
    close: "outside",
    replace: true,
  });

  hideFloatingHandles();
}

function hideFloatingHandles(): void {
  let tries = 0;
  const poll = () => {
    const docs = [document];
    if (window.parent?.document && window.parent.document !== document) {
      docs.push(window.parent.document);
    }
    for (const d of docs) {
      try {
        const container = d.querySelector('[id$="--ac-dropdown"]');
        if (!container) continue;
        for (const sel of [".draggable-handle", ".resizable-handle"]) {
          const el = container.querySelector(sel) as HTMLElement | null;
          if (el) el.style.display = "none";
        }
        (container as HTMLElement).style.pointerEvents = "none";
        const contentEl = container.querySelector(".ls-ui-float-content") as HTMLElement | null;
        if (contentEl) contentEl.style.pointerEvents = "auto";
        container.removeAttribute("draggable");
        container.removeAttribute("resizable");
        (container as HTMLElement).tabIndex = 0;
        (container as HTMLElement).focus({ preventScroll: true });
        (container as HTMLElement).addEventListener("keydown", (e) => {
          if (e.key === "Tab" && visible) {
            e.preventDefault();
            e.stopPropagation();
            confirmCallback?.();
          }
        });
        return;
      } catch {
        /* cross-origin */
      }
    }
    if (++tries < 20) setTimeout(poll, 50);
  };
  poll();
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    hide();
  }
}

export function onTabConfirm(cb: () => void): void {
  confirmCallback = cb;
}

export function init(): void {
  document.addEventListener("keydown", onKeyDown);
  try {
    if (window.parent?.document && window.parent.document !== document) {
      window.parent.document.addEventListener("keydown", onKeyDown, true);
    }
  } catch {
    /* cross-origin */
  }

  logseq.provideStyle(`
[id$="--ac-dropdown"] {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  min-width: 0 !important;
  width: fit-content !important;
  padding: 0 !important;
  outline: none !important;
}
.ac-dropdown {
  background: color-mix(in srgb, var(--ls-primary-background-color, #fff) 72%, transparent);
  backdrop-filter: blur(6px);
  border: 1px solid color-mix(in srgb, var(--ls-primary-text-color, #333) 10%, transparent);
  border-radius: 6px;
  padding: 2px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: var(--ls-primary-text-color, #333);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.4;
}
.ac-item {
  padding: 2px 6px;
  cursor: pointer;
  opacity: 0.45;
}
.ac-item.selected {
  opacity: 0.8;
}
.ac-more {
  padding: 0 6px;
  opacity: 0.25;
  pointer-events: none;
  user-select: none;
}
.ac-type {
  font-size: 0.8em;
  opacity: 0.5;
}
  `);
}
