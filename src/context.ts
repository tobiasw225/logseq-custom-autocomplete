export function isInsideWikilink(content: string, pos: number): boolean {
  let lastOpen = -1;
  let lastClose = -1;
  for (let i = pos - 1; i >= 0; i--) {
    if (i > 0 && content[i] === "[" && content[i - 1] === "[") {
      lastOpen = i - 1;
      break;
    }
    if (i > 0 && content[i] === "]" && content[i - 1] === "]") {
      lastClose = i - 1;
      break;
    }
  }
  if (lastOpen === -1) return false;
  return lastOpen > lastClose;
}

export function isInsideTag(content: string, pos: number): boolean {
  const wordChars = /[a-zA-Z0-9_\-\p{L}]/u;
  let i = pos - 1;
  while (i >= 0 && wordChars.test(content[i])) i--;
  if (i >= 0 && content[i] === "#") {
    if (i === 0 || /\s/.test(content[i - 1])) return true;
  }
  return false;
}

export function isInsideCodeBlock(content: string, pos: number): boolean {
  const beforeCursor = content.slice(0, pos);
  const lines = beforeCursor.split("\n");
  let fenceCount = 0;
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      fenceCount++;
    }
  }
  return fenceCount % 2 === 1;
}

export function isInsideUrl(content: string, pos: number): boolean {
  let searchFrom = 0;
  while (searchFrom < pos) {
    const idx = content.indexOf("://", searchFrom);
    if (idx === -1 || idx >= pos) break;
    if (idx > 0 && /[a-zA-Z]/.test(content[idx - 1])) {
      let schemeStart = idx - 1;
      while (schemeStart > 0 && /[a-zA-Z0-9+]/.test(content[schemeStart - 1])) schemeStart--;
      const segment = content.slice(schemeStart, pos);
      if (/^\S+$/.test(segment)) return true;
    }
    searchFrom = idx + 3;
  }
  return false;
}

export function isInIgnoredContext(content: string, pos: number): boolean {
  return (
    isInsideWikilink(content, pos) ||
    isInsideTag(content, pos) ||
    isInsideCodeBlock(content, pos) ||
    isInsideUrl(content, pos)
  );
}
