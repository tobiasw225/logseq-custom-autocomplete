import "@logseq/libs"
import { getWordAtCursor } from "./utils"
import type { Suggestion } from "./utils"
import { getSuggestions } from "./suggestions"
import {
  show,
  hide,
  isVisible,
  selectNext,
  selectPrev,
  getSelected,
  init as initUI,
} from "./ui-host"

let lastPrefix = ""
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isProcessing = false

async function checkAndSuggest(): Promise<void> {
  if (isProcessing) return
  isProcessing = true
  try {
    const block = await logseq.Editor.getCurrentBlock()
    if (!block) {
      if (isVisible()) hide()
      return
    }

    const content = block.content ?? ""
    const cursorPos = await logseq.Editor.getEditingCursorPosition()
    if (!cursorPos) {
      if (isVisible()) hide()
      return
    }

    const atEnd = cursorPos.pos >= content.length
    const cursorChar = content[cursorPos.pos]
    if (!atEnd && cursorChar && !/[a-zA-Z0-9_\-\p{L}]/u.test(cursorChar)) {
      if (isVisible()) hide()
      return
    }

    const word = getWordAtCursor(content, cursorPos.pos)
    if (!word) {
      if (isVisible()) hide()
      return
    }

    console.log(`[ac] word: "${word}"`)

    if (word === lastPrefix && isVisible()) return
    lastPrefix = word

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        console.log(`[ac] querying: "${word}"`)
        const suggestions = await getSuggestions(word)
        console.log(`[ac] ${suggestions.length} suggestions`)
        if (suggestions.length > 0) {
          show(suggestions, cursorPos.rect.left, cursorPos.rect.top + cursorPos.rect.height + 4)
        } else if (isVisible()) {
          hide()
        }
      } catch (err) {
        console.error("autocomplete query error:", err)
      }
    }, 150)
  } catch (err) {
    console.error("autocomplete check error:", err)
  } finally {
    isProcessing = false
  }
}

async function confirmSuggestion(): Promise<void> {
  if (!isVisible()) return
  const selected = getSelected()
  if (!selected) return
  await insertSuggestion(selected)
}

async function insertSuggestion(suggestion: Suggestion): Promise<void> {
  try {
    const block = await logseq.Editor.getCurrentBlock()
    if (!block) return
    const content = block.content ?? ""
    const cursorPos = await logseq.Editor.getEditingCursorPosition()
    if (!cursorPos) return
    const word = getWordAtCursor(content, cursorPos.pos)
    if (!word) return

    const idx = content.indexOf(word, Math.max(0, cursorPos.pos - word.length))
    if (idx === -1) return
    const replacement =
      suggestion.type === "page" ? `[[${suggestion.text}]]` :
      suggestion.type === "tag" ? `#${suggestion.text}` :
      suggestion.text
    const newContent =
      content.slice(0, idx) + replacement + content.slice(idx + word.length)
    await logseq.Editor.updateBlock(block.uuid, newContent)
  } catch (err) {
    console.error("autocomplete insert error:", err)
  }
  hide()
  lastPrefix = ""
}

function main(): void {
  initUI()

  console.log("[ac] loaded")

  let lastCheck = 0
  logseq.DB.onChanged(async ({ blocks }) => {
    const now = Date.now()
    if (now - lastCheck < 200) return
    lastCheck = now

    const currentBlock = await logseq.Editor.getCurrentBlock()
    if (!currentBlock) return

    const changed = blocks.some((b: any) => b.uuid === currentBlock.uuid)
    if (!changed) return

    checkAndSuggest().catch(console.error)
  })

  logseq.App.registerCommandShortcut(
    { binding: "alt+j", label: "Autocomplete: next suggestion" },
    () => { if (isVisible()) selectNext() },
  )
  logseq.App.registerCommandShortcut(
    { binding: "alt+k", label: "Autocomplete: previous suggestion" },
    () => { if (isVisible()) selectPrev() },
  )
  logseq.App.registerCommandShortcut(
    { binding: "mod+space", label: "Autocomplete: confirm suggestion" },
    () => { confirmSuggestion().catch(console.error) },
  )
  logseq.App.registerCommandShortcut(
    { binding: "enter", label: "Autocomplete: confirm suggestion" },
    () => { if (isVisible()) confirmSuggestion().catch(console.error) },
  )
}

logseq.ready(main).catch(console.error)
