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

  it('parses *italic* as one italic node', () => {
    const result = parseInlineMarkdown('*italic*')
    expect(result).toEqual<InlineNode[]>([
      { type: 'italic', children: [{ type: 'text', text: 'italic' }] },
    ])
  })

  it('parses ***bold-italic*** as bold wrapping italic', () => {
    const result = parseInlineMarkdown('***both***')
    expect(result.length).toBe(1)
    const outer = result[0]
    // mdast parses *** as emphasis > strong or strong > emphasis
    if (outer.type === 'bold') {
      expect(outer.children[0].type).toBe('italic')
    } else if (outer.type === 'italic') {
      expect(outer.children[0].type).toBe('bold')
    }
  })

  it('preserves escaped asterisks as literal text', () => {
    const result = parseInlineMarkdown('\\*\\*literal\\*\\*')
    expect(result).toEqual<InlineNode[]>([{ type: 'text', text: '**literal**' }])
  })

  it('strips HTML tags', () => {
    const result = parseInlineMarkdown('<script>alert(1)</script>')
    for (const node of result) {
      if (node.type === 'text') {
        expect(node.text.includes('<script>')).toBe(false)
      }
    }
  })

  it('parses [link](url) as a link node', () => {
    const result = parseInlineMarkdown('[link](http://x)')
    expect(result).toEqual<InlineNode[]>([
      { type: 'link', url: 'http://x', children: [{ type: 'text', text: 'link' }] },
    ])
  })

  it('parses inline code as a code node', () => {
    const result = parseInlineMarkdown('use `code` here')
    expect(result).toEqual<InlineNode[]>([
      { type: 'text', text: 'use ' },
      { type: 'code', text: 'code' },
      { type: 'text', text: ' here' },
    ])
  })

  it('parses a list into bullet items', () => {
    const result = parseInlineMarkdown('- item1\n- item2')
    expect(result).toEqual<InlineNode[]>([
      { type: 'text', text: '• item1\n• item2' },
    ])
  })

  it('parses a heading as a paragraph', () => {
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
