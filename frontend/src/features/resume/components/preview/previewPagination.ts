export interface PageSlice {
  offset: number
  inset: number
  visibleHeight: number
}

type PageItemLevel = 'section' | 'child' | 'fragment'

interface LineRect {
  top: number
  bottom: number
}

interface PageItem {
  top: number
  bottom: number
  effectiveBottom: number
  level: PageItemLevel
  lines?: LineRect[]
}

export const A4_PREVIEW_WIDTH_PX = 794
export const A4_PREVIEW_HEIGHT_PX = 1123
export const A4_PREVIEW_PAGE_GAP_PX = 28
export const A4_PREVIEW_CONTINUATION_TOP_SPACING_PX = 56

export function createDefaultPageSlices(): PageSlice[] {
  return [{ offset: 0, inset: 0, visibleHeight: A4_PREVIEW_HEIGHT_PX }]
}

export function createSinglePageSlice(contentHeight: number): PageSlice[] {
  return [{ offset: 0, inset: 0, visibleHeight: contentHeight }]
}

export function readMeasuredPageItems(root: HTMLElement): PageItem[] {
  const rootRect = root.getBoundingClientRect()
  const selector = '[data-preview-page-item], [data-preview-page-item-child], [data-preview-page-item-fragment]'
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector))

  const items: PageItem[] = []

  for (const node of nodes) {
    const rect = node.getBoundingClientRect()
    const top = rect.top - rootRect.top
    const bottom = rect.bottom - rootRect.top

    if (bottom <= top) {
      continue
    }

    let level: PageItemLevel
    if (node.hasAttribute('data-preview-page-item')) {
      level = 'section'
    } else if (node.hasAttribute('data-preview-page-item-child')) {
      level = 'child'
    } else {
      level = 'fragment'
    }

    const keepWithNext = node.dataset.previewKeepWithNext === 'true'
    let effectiveBottom = bottom
    if (keepWithNext) {
      const next = node.nextElementSibling as HTMLElement | null
      if (next) {
        const nextRect = next.getBoundingClientRect()
        effectiveBottom = Math.max(bottom, nextRect.bottom - rootRect.top)
      }
    }

    let lines: LineRect[] | undefined
    if (level === 'fragment' && node.firstChild) {
      try {
        const range = node.ownerDocument!.createRange()
        range.selectNodeContents(node)
        const rectList = range.getClientRects()
        const collected: LineRect[] = []
        for (let index = 0; index < rectList.length; index += 1) {
          const lineRect = rectList[index]
          if (lineRect.height <= 0) {
            continue
          }
          collected.push({
            top: lineRect.top - rootRect.top,
            bottom: lineRect.bottom - rootRect.top,
          })
        }
        if (collected.length > 0) {
          lines = collected
        }
        range.detach?.()
      } catch {
        lines = undefined
      }
    }

    items.push({ top, bottom, effectiveBottom, level, lines })
  }

  return items
}

export function createPagedPreviewSlices(contentHeight: number, items: PageItem[], continuationTopSpacing: number) {
  const safeContentHeight = Math.max(A4_PREVIEW_HEIGHT_PX, contentHeight)
  const normalizedItems = items
    .map((item) => ({
      top: Math.max(0, Math.floor(item.top)),
      bottom: Math.max(0, Math.ceil(item.bottom)),
      effectiveBottom: Math.max(0, Math.ceil(item.effectiveBottom)),
      level: item.level,
      lines: item.lines?.map((line) => ({
        top: Math.max(0, Math.floor(line.top)),
        bottom: Math.max(0, Math.ceil(line.bottom)),
      })),
    }))
    .sort((left, right) => left.top - right.top)

  const slices: PageSlice[] = []
  let currentOffset = 0
  let pageIndex = 0
  let guard = 0

  while (currentOffset < safeContentHeight && guard < 200) {
    const inset = pageIndex === 0 ? 0 : continuationTopSpacing
    const capacity = Math.max(1, A4_PREVIEW_HEIGHT_PX - inset)
    const visibleLimit = currentOffset + capacity

    if (visibleLimit >= safeContentHeight) {
      slices.push({ offset: currentOffset, inset, visibleHeight: safeContentHeight - currentOffset })
      break
    }

    let breakAt = visibleLimit

    const sectionNearBottom = normalizedItems.find(
      (item) =>
        item.level === 'section' &&
        item.top > currentOffset &&
        item.top <= visibleLimit &&
        item.top > visibleLimit - 80 &&
        item.effectiveBottom > visibleLimit,
    )

    if (sectionNearBottom) {
      breakAt = sectionNearBottom.top
    } else {
      const spanning = normalizedItems.find(
        (item) => item.level !== 'section' && item.lines && item.lines.length > 0 && item.top < visibleLimit && item.bottom > visibleLimit,
      )

      if (spanning?.lines) {
        let lastFittingBottom = -1
        for (const line of spanning.lines) {
          if (line.bottom <= visibleLimit && line.top >= currentOffset) {
            lastFittingBottom = Math.max(lastFittingBottom, line.bottom)
          }
        }
        if (lastFittingBottom > currentOffset) {
          breakAt = lastFittingBottom
        } else {
          breakAt = spanning.top > currentOffset ? spanning.top : visibleLimit
        }
      }
    }

    const minProgress = Math.max(1, Math.floor(capacity * 0.2))
    if (breakAt - currentOffset < minProgress) {
      breakAt = visibleLimit
    }

    const visibleHeight = Math.min(capacity, breakAt - currentOffset)
    slices.push({ offset: currentOffset, inset, visibleHeight })
    currentOffset += visibleHeight
    pageIndex += 1
    guard += 1
  }

  return slices
}

export function arePageSlicesEqual(current: PageSlice[], next: PageSlice[]) {
  if (current.length !== next.length) {
    return false
  }

  return current.every(
    (slice, index) => slice.offset === next[index].offset && slice.inset === next[index].inset && slice.visibleHeight === next[index].visibleHeight,
  )
}
