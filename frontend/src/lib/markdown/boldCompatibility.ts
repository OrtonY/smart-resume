export const BOLD_COMPAT_MARKER = '\u200B'

export function normalizeMarkdownBoldForCjk(input: string): string {
  if (!input || !input.includes('**')) {
    return input
  }

  let result = ''
  let index = 0
  let inFenceCode = false
  let inInlineCode = false

  while (index < input.length) {
    if (!inInlineCode && isFenceDelimiterAt(input, index)) {
      inFenceCode = !inFenceCode
      result += '```'
      index += 3
      continue
    }

    const ch = input[index]
    if (!inFenceCode && ch === '`' && !isEscapedAt(input, index)) {
      inInlineCode = !inInlineCode
      result += ch
      index += 1
      continue
    }

    if (!inFenceCode && !inInlineCode && isStandaloneBoldDelimiterAt(input, index)) {
      const close = findClosingBoldDelimiter(input, index + 2)
      if (close >= 0) {
        const inner = input.slice(index + 2, close)
        result += `**${wrapWithCompatMarker(inner)}**`
        index = close + 2
        continue
      }
    }

    result += ch
    index += 1
  }

  return result
}

export function stripMarkdownCompatMarkers(input: string): string {
  if (!input || !input.includes(BOLD_COMPAT_MARKER)) {
    return input
  }
  return input.split(BOLD_COMPAT_MARKER).join('')
}

function wrapWithCompatMarker(value: string): string {
  const withStart = value.startsWith(BOLD_COMPAT_MARKER) ? value : `${BOLD_COMPAT_MARKER}${value}`
  return withStart.endsWith(BOLD_COMPAT_MARKER) ? withStart : `${withStart}${BOLD_COMPAT_MARKER}`
}

function findClosingBoldDelimiter(text: string, from: number): number {
  let index = from
  let inFenceCode = false
  let inInlineCode = false

  while (index < text.length) {
    if (!inInlineCode && isFenceDelimiterAt(text, index)) {
      inFenceCode = !inFenceCode
      index += 3
      continue
    }

    const ch = text[index]
    if (!inFenceCode && ch === '`' && !isEscapedAt(text, index)) {
      inInlineCode = !inInlineCode
      index += 1
      continue
    }

    if (!inFenceCode && !inInlineCode && isStandaloneBoldDelimiterAt(text, index)) {
      return index
    }

    index += 1
  }

  return -1
}

function isFenceDelimiterAt(text: string, index: number): boolean {
  return text[index] === '`' && text[index + 1] === '`' && text[index + 2] === '`' && !isEscapedAt(text, index)
}

function isStandaloneBoldDelimiterAt(text: string, index: number): boolean {
  return (
    text[index] === '*' &&
    text[index + 1] === '*' &&
    !isEscapedAt(text, index) &&
    text[index - 1] !== '*' &&
    text[index + 2] !== '*'
  )
}

function isEscapedAt(text: string, index: number): boolean {
  let slashCount = 0
  let cursor = index - 1
  while (cursor >= 0 && text[cursor] === '\\') {
    slashCount += 1
    cursor -= 1
  }
  return slashCount % 2 === 1
}
