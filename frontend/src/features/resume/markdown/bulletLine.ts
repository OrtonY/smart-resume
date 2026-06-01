export interface MarkdownBulletLine {
  lineIndex: number
  lineStart: number
  lineEnd: number
  lineText: string
}

const MARKDOWN_LIST_ITEM_PATTERN = /^(\s*)([-+*]|\d+[.)])(\s+)(.+)$/

export function findMarkdownListItemLine(value: string, cursorPosition: number): MarkdownBulletLine | null {
  const position = Math.max(0, Math.min(cursorPosition, value.length))
  const lineStart = value.lastIndexOf('\n', position - 1) + 1
  const nextBreak = value.indexOf('\n', position)
  const lineEnd = nextBreak === -1 ? value.length : nextBreak
  const lineText = value.slice(lineStart, lineEnd)
  const lineIndex = value.slice(0, lineStart).split('\n').length - 1

  if (!MARKDOWN_LIST_ITEM_PATTERN.test(lineText)) {
    return null
  }

  return {
    lineIndex,
    lineStart,
    lineEnd,
    lineText,
  }
}

export function normalizeRewrittenBulletLine(originalLine: string, rewrittenLine: string) {
  const originalMatch = MARKDOWN_LIST_ITEM_PATTERN.exec(originalLine)
  const rewrittenMatch = MARKDOWN_LIST_ITEM_PATTERN.exec(rewrittenLine.trim())

  if (!originalMatch) {
    return rewrittenLine.trim()
  }

  const rewrittenContent = (rewrittenMatch?.[4] ?? rewrittenLine).trim()
  if (!rewrittenContent) {
    return originalLine
  }

  return `${originalMatch[1]}${originalMatch[2]}${originalMatch[3]}${rewrittenContent}`
}

export function replaceMarkdownLine(value: string, line: MarkdownBulletLine, replacementLine: string) {
  return `${value.slice(0, line.lineStart)}${replacementLine}${value.slice(line.lineEnd)}`
}

export function replaceMarkdownLineByIndex(value: string, lineIndex: number, replacementLine: string) {
  const lines = value.split('\n')
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return value
  }
  lines[lineIndex] = replacementLine
  return lines.join('\n')
}

export function replaceTextRange(value: string, start: number, end: number, replacementText: string) {
  const safeStart = Math.max(0, Math.min(start, value.length))
  const safeEnd = Math.max(safeStart, Math.min(end, value.length))
  return `${value.slice(0, safeStart)}${replacementText}${value.slice(safeEnd)}`
}
