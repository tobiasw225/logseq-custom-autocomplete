import "@logseq/libs";
import type { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";
import { learnFromBlockContent, loadSessionWords, preloadSessionWords } from "./session";
import { createSuggestionSession } from "./suggestion-session";
import { getSuggestions } from "./suggestions";
import { getCurrentSuggestions, hide, init as initUI, isVisible, selectNext, selectPrev, show } from "./ui-host";

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
      key: "frequencyWeightDict",
      type: "number",
      default: 0.3,
      title: "Frequency Weight",
      description: "How much word usage frequency matters in ranking (0–1). 0 = match score only, 1 = frequency only.",
      inputAs: "range",
    },
    {
      key: "enableContextFilter",
      type: "boolean",
      default: true,
      title: "Enable context-aware filtering",
      description: "When enabled, suggestions are suppressed inside code blocks and URLs.",
    },
  ];
}

const session = createSuggestionSession({
  editor: {
    getCurrentBlock: () => logseq.Editor.getCurrentBlock(),
    getEditingCursorPosition: () => logseq.Editor.getEditingCursorPosition(),
    updateBlock: (uuid, content) => logseq.Editor.updateBlock(uuid, content),
  },
  ui: {
    isVisible,
    show,
    hide,
    getCurrentSuggestions,
  },
  settings: {
    read(key) {
      return (logseq.settings as Record<string, unknown> | undefined)?.[key];
    },
  },
  clock: {
    now: () => Date.now(),
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
  },
  query: getSuggestions,
  learn: learnFromBlockContent,
});

export async function checkAndSuggest(): Promise<void> {
  await session.onContentChanged();
}

export async function confirmSuggestion(): Promise<void> {
  await session.accept();
}

function main(): void {
  initUI();
  logseq.useSettingsSchema(settingsSchema());
  loadSessionWords();
  preloadSessionWords().catch(console.error);

  logseq.DB.onChanged(async ({ blocks }) => {
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
