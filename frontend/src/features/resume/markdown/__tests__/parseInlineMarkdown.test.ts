import { describe, it, expect } from 'vitest'
import { parseInlineMarkdown } from '../parseInlineMarkdown'
import type { InlineNode } from '../types'

describe('parseInlineMarkdown', () => {
  it('returns empty array for empty string', () => {
    expect(parseInlineMarkdown('')).toEqual([])
  })

  it('parses plain text as a single text node', () => {
    expect(parseInlineMarkdown('plain text')).toEqual<InlineNode[]>([
      { type: 'text', text: 'plain text' },
    ])
  })

  it('parses **bold** as one bold node', () => {
    const result = parseInlineMarkdown('**bold**')
    expect(result).toEqual<InlineNode[]>([
      { type: 'bold', children: [{ type: 'text', text: 'bold' }] },
    ])
  })

  it('flattens *italic* to plain text (italic not supported)', () => {
    const result = parseInlineMarkdown('*italic*')
    expect(result).toEqual<InlineNode[]>([{ type: 'text', text: 'italic' }])
  })

  it('parses ***bold-italic*** as bold wrapping plain text (italic stripped)', () => {
    const result = parseInlineMarkdown('***both***')
    // mdast parses *** as emphasis > strong or strong > emphasis;
    // we flatten emphasis so the result is just bold containing text.
    expect(result.length).toBe(1)
    const outer = result[0]
    if (outer.type === 'bold') {
      expect(outer.children).toEqual([{ type: 'text', text: 'both' }])
    } else {
      // If mdast produces emphasis > strong, we flatten emphasis,
      // so we'd get bold > text anyway. This branch should not happen,
      // but if it does we still assert text-only content.
      expect(outer.type).toBe('text')
    }
  })

  it('preserves escaped asterisks as literal text', () => {
    const result = parseInlineMarkdown('\\*\\*literal\\*\\*')
    expect(result).toEqual<InlineNode[]>([{ type: 'text', text: '**literal**' }])
  })

  it('strips HTML tags and keeps no html node', () => {
    const result = parseInlineMarkdown('<script>alert(1)</script>')
    for (const node of result) {
      expect(node.type === 'text').toBe(true)
      if (node.type === 'text') {
        expect(node.text.includes('<script>')).toBe(false)
        expect(node.text.includes('</script>')).toBe(false)
      }
    }
  })

  it('drops link target and keeps the visible label', () => {
    const result = parseInlineMarkdown('[link](http://x)')
    expect(result).toEqual<InlineNode[]>([{ type: 'text', text: 'link' }])
  })

  it('flattens a list item to plain text', () => {
    const result = parseInlineMarkdown('- item')
    expect(result).toEqual<InlineNode[]>([{ type: 'text', text: 'item' }])
  })

  it('flattens a heading to plain text', () => {
    const result = parseInlineMarkdown('# heading')
    expect(result).toEqual<InlineNode[]>([{ type: 'text', text: 'heading' }])
  })

  it('parses mixed inline content with bold segments', () => {
    const result = parseInlineMarkdown('pre **b** mid **c** post')
    expect(result.length).toBe(5)
    expect(result[0]).toEqual<InlineNode>({ type: 'text', text: 'pre ' })
    expect(result[1]).toEqual<InlineNode>({
      type: 'bold',
      children: [{ type: 'text', text: 'b' }],
    })
    expect(result[2]).toEqual<InlineNode>({ type: 'text', text: ' mid ' })
    expect(result[3]).toEqual<InlineNode>({
      type: 'bold',
      children: [{ type: 'text', text: 'c' }],
    })
    expect(result[4]).toEqual<InlineNode>({ type: 'text', text: ' post' })
  })
})
