import "@logseq/libs";
import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";
import { isInIgnoredContext } from "./context";
import { learnFromBlockContent, loadSessionWords, preloadSessionWords } from "./session";
import { getSuggestions } from "./suggestions";
import { getSelected, hide, init as initUI, isVisible, selectNext, selectPrev, show } from "./ui-host";
import { getWordAtCursor } from "./utils";
import type { Suggestion } from "./utils";

function settingsSchema(): SettingSchemaDesc[] {
  return [
    {
      key: "autoExpandOnUnique",
      type: "boolean",
      default: false,
      title: "Auto-expand on unique match",
      description: "When enabled and only one suggestion exists, it is inserted automatically.",
    },
    {
      key: "suggestionDebounceDelay",
      type: "number",
      default: 80,
      title: "Suggestion Delay (ms)",
      description: "How long to wait after the last keystroke before querying suggestions (0–500).",
      inputAs: "range",
    },
    {
      key: "minInterval",
      type: "number",
      default: 80,
      title: "Min Interval (ms)",
      description: "Minimum time between repeated suggestion queries (0–500).",
      inputAs: "range",
    },
    {
      key: "frequencyWeightPage",
      type: "number",
      default: 0.3,
      title: "Page Freq. Weight",
      description: "How much page usage frequency matters in ranking (0–1). 0 = match score only, 1 = frequency only.",
      inputAs: "range",
    },
    {
      key: "frequencyWeightTag",
      type: "number",
      default: 0.3,
      title: "Tag Freq. Weight",
      description: "How much tag usage frequency matters in ranking (0–1). 0 = match score only, 1 = frequency only.",
      inputAs: "range",
    },
    {
      key: "frequencyWeightDict",
      type: "number",
      default: 0.3,
      title: "Dict Freq. Weight",
      description:
        "How much dictionary-word usage frequency matters in ranking (0–1). 0 = match score only, 1 = frequency only.",
      inputAs: "range",
    },
    {
      key: "enableContextFilter",
      type: "boolean",
      default: true,
      title: "Enable context-aware filtering",
      description: "When enabled, suggestions are suppressed inside [[wikilinks]], #tags, code blocks, and URLs.",
    },
  ];
}

let lastPrefix = "";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;

export async function checkAndSuggest(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) {
      if (isVisible()) hide();
      return;
    }

    const content = block.content ?? "";
    const cursorPos = await logseq.Editor.getEditingCursorPosition();
    if (!cursorPos) {
      if (isVisible()) hide();
      return;
    }

    if ((logseq.settings as Record<string, unknown>)?.enableContextFilter !== false) {
      if (isInIgnoredContext(content, cursorPos.pos)) {
        if (isVisible()) hide();
        return;
      }
    }

    const atEnd = cursorPos.pos >= content.length;
    const cursorChar = content[cursorPos.pos];
    if (!atEnd && cursorChar && !/[a-zA-Z0-9_\-\p{L}]/u.test(cursorChar)) {
      if (isVisible()) hide();
      return;
    }

    const word = getWordAtCursor(content, cursorPos.pos);
    learnFromBlockContent(content, word);
    if (!word) {
      if (isVisible()) hide();
      return;
    }

    if (word === lastPrefix && isVisible()) return;
    lastPrefix = word;

    const debounceDelay = Number((logseq.settings as Record<string, unknown>)?.suggestionDebounceDelay ?? 80);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const suggestions = await getSuggestions(word);
        if (suggestions.length > 0) {
          const autoExpand = (logseq.settings as Record<string, unknown>)?.autoExpandOnUnique === true;
          if (autoExpand && suggestions.length === 1) {
            const block = await logseq.Editor.getCurrentBlock();
            const cursor = await logseq.Editor.getEditingCursorPosition();
            if (block && cursor) {
              const currentWord = getWordAtCursor(block.content ?? "", cursor.pos);
              if (currentWord === word) {
                await insertSuggestion(suggestions[0]);
                return;
              }
            }
          }
          show(suggestions, cursorPos.rect.left, cursorPos.rect.top + cursorPos.rect.height + 4, word);
        } else if (isVisible()) {
          hide();
        }
      } catch (err) {
        console.error("autocomplete query error:", err);
      }
    }, debounceDelay);
  } catch (err) {
    console.error("autocomplete check error:", err);
  } finally {
    isProcessing = false;
  }
}

export async function confirmSuggestion(): Promise<void> {
  if (!isVisible()) return;
  const selected = getSelected();
  if (!selected) return;
  await insertSuggestion(selected);
}

async function insertSuggestion(suggestion: Suggestion): Promise<void> {
  try {
    const block = await logseq.Editor.getCurrentBlock();
    if (!block) return;
    const content = block.content ?? "";
    const cursorPos = await logseq.Editor.getEditingCursorPosition();
    if (!cursorPos) return;
    const word = getWordAtCursor(content, cursorPos.pos);
    if (!word) return;

    const lowerWord = word.toLowerCase();
    const lowerSugg = suggestion.text.toLowerCase();
    const completed = lowerSugg.startsWith(lowerWord)
      ? word + suggestion.text.slice(lowerWord.length)
      : suggestion.text;

    const idx = content.indexOf(word, Math.max(0, cursorPos.pos - word.length));
    if (idx === -1) return;
    const replacement =
      suggestion.type === "page" ? `[[${completed}]]` : suggestion.type === "tag" ? `#${completed}` : completed;
    const newContent = content.slice(0, idx) + replacement + content.slice(idx + word.length);
    await logseq.Editor.updateBlock(block.uuid, newContent);
  } catch (err) {
    console.error("autocomplete insert error:", err);
  }
  hide();
  lastPrefix = "";
}

function main(): void {
  initUI();
  logseq.useSettingsSchema(settingsSchema());
  loadSessionWords();
  preloadSessionWords().catch(console.error);

  let lastCheck = 0;
  const minInterval = Number((logseq.settings as Record<string, unknown>)?.minInterval ?? 80);
  logseq.DB.onChanged(async ({ blocks }) => {
    const now = Date.now();
    if (now - lastCheck < minInterval) return;
    lastCheck = now;

    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (!currentBlock) return;

    const changed = blocks.some((b: { uuid: string }) => b.uuid === currentBlock.uuid);
    if (!changed) return;

    checkAndSuggest().catch(console.error);
  });

  logseq.App.registerCommandShortcut({ binding: "alt+j" }, () => {
    if (isVisible()) selectNext();
  });
  logseq.App.registerCommandShortcut({ binding: "alt+," }, () => {
    if (isVisible()) selectPrev();
  });
  logseq.App.registerCommandShortcut({ binding: "ctrl+space" }, () => {
    if (isVisible()) confirmSuggestion().catch(console.error);
  });
}

logseq.ready(main).catch(console.error);
