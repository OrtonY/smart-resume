import { describe, expect, it } from 'vitest'
import {
  findMarkdownListItemLine,
  normalizeRewrittenBulletLine,
  replaceMarkdownLine,
} from '../bulletLine'

describe('bulletLine', () => {
  it('finds the markdown list item on the current cursor line', () => {
    const value = 'Intro\n- First impact\n- Second impact'

    expect(findMarkdownListItemLine(value, value.indexOf('Second'))).toEqual({
      lineIndex: 2,
      lineStart: 21,
      lineEnd: 36,
      lineText: '- Second impact',
    })
  })

  it('ignores non-list current lines', () => {
    const value = 'Intro\n- First impact'

    expect(findMarkdownListItemLine(value, 2)).toBeNull()
  })

  it('preserves the original marker when normalizing an AI rewrite', () => {
    expect(normalizeRewrittenBulletLine('  2. Built API', '- Improved API latency by 40%')).toBe(
      '  2. Improved API latency by 40%',
    )
  })

  it('replaces only the target line', () => {
    const value = '- One\n- Two\n- Three'
    const line = findMarkdownListItemLine(value, value.indexOf('Two'))

    expect(line).not.toBeNull()
    expect(replaceMarkdownLine(value, line!, '- Rewritten two')).toBe('- One\n- Rewritten two\n- Three')
  })
})
