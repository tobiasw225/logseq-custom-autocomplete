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
  return isInsideCodeBlock(content, pos) || isInsideUrl(content, pos);
}
