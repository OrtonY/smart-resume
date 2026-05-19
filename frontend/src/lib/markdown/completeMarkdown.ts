/**
 * Completes unclosed markdown markers so partial streaming content
 * renders correctly without "swallowing" subsequent text.
 */
export function completeMarkdown(text: string): string {
  let result = text

  // Fenced code blocks: count opening ``` and closing ```
  const fenceMatches = result.match(/^```/gm)
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    result += '\n```'
  }

  // Inline code: count unescaped backticks (outside fenced blocks)
  const inlineBackticks = countUnpairedInlineMarker(result, '`')
  if (inlineBackticks % 2 !== 0) {
    result += '`'
  }

  // Bold (**): count unescaped **
  const boldCount = countUnpairedInlineMarker(result, '**')
  if (boldCount % 2 !== 0) {
    result += '**'
  }

  // Italic with underscore (_): only single underscores used as emphasis
  const underscoreCount = countUnpairedUnderscoreEmphasis(result)
  if (underscoreCount % 2 !== 0) {
    result += '_'
  }

  // Unclosed link: [text without closing ](...)
  const lastOpenBracket = result.lastIndexOf('[')
  if (lastOpenBracket >= 0) {
    const afterBracket = result.slice(lastOpenBracket)
    if (!afterBracket.includes(']')) {
      result += ']()'
    } else if (afterBracket.includes('](') && !afterBracket.includes(')')) {
      result += ')'
    }
  }

  return result
}

function countUnpairedInlineMarker(text: string, marker: string): number {
  // Strip fenced code blocks before counting
  const stripped = text.replace(/```[\s\S]*?```/g, '')
  let count = 0
  let idx = 0
  while (idx < stripped.length) {
    const pos = stripped.indexOf(marker, idx)
    if (pos < 0) break
    if (pos > 0 && stripped[pos - 1] === '\\') {
      idx = pos + marker.length
      continue
    }
    count++
    idx = pos + marker.length
  }
  return count
}

function countUnpairedUnderscoreEmphasis(text: string): number {
  // Strip fenced code blocks and inline code
  const stripped = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
  let count = 0
  let idx = 0
  while (idx < stripped.length) {
    const pos = stripped.indexOf('_', idx)
    if (pos < 0) break
    // Skip __ (which is bold, handled by ** logic or separate)
    if (pos + 1 < stripped.length && stripped[pos + 1] === '_') {
      idx = pos + 2
      continue
    }
    if (pos > 0 && stripped[pos - 1] === '\\') {
      idx = pos + 1
      continue
    }
    count++
    idx = pos + 1
  }
  return count
}
