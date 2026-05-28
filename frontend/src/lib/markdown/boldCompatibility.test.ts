import { describe, expect, it } from 'vitest'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { normalizeMarkdownBoldForCjk, stripMarkdownCompatMarkers } from './boldCompatibility'

describe('normalizeMarkdownBoldForCjk', () => {
  it('keeps ASCII bold adjacent to text working', () => {
    const tree = fromMarkdown(normalizeMarkdownBoldForCjk('A**q**B'))
    expect(tree.children[0]?.type).toBe('paragraph')
    expect((tree.children[0] as { children?: Array<{ type: string }> }).children?.map((node) => node.type)).toEqual([
      'text',
      'strong',
      'text',
    ])
  })

  it('makes quoted bold adjacent to text parse as strong', () => {
    const tree = fromMarkdown(normalizeMarkdownBoldForCjk('A**"quoted"**B'))
    expect((tree.children[0] as { children?: Array<{ type: string }> }).children?.map((node) => node.type)).toEqual([
      'text',
      'strong',
      'text',
    ])
  })

  it('makes CJK bold adjacent to text parse as strong', () => {
    const tree = fromMarkdown(normalizeMarkdownBoldForCjk('A**\u4E2D**B'))
    expect((tree.children[0] as { children?: Array<{ type: string }> }).children?.map((node) => node.type)).toEqual([
      'text',
      'strong',
      'text',
    ])
  })

  it('does not rewrite inline code content', () => {
    const normalized = normalizeMarkdownBoldForCjk('A `**"quoted"**` B')
    expect(stripMarkdownCompatMarkers(normalized)).toBe('A `**"quoted"**` B')
  })
})
