import { useEffect, useState } from 'react'
import {
  A4_PREVIEW_CONTINUATION_TOP_SPACING_PX,
  A4_PREVIEW_HEIGHT_PX,
  A4_PREVIEW_WIDTH_PX,
  arePageSlicesEqual,
  createDefaultPageSlices,
  createPagedPreviewSlices,
  createSinglePageSlice,
  readMeasuredPageItems,
  type PageSlice,
} from './previewPagination'

interface ResumePreviewMetrics {
  contentHeight: number
  pageSlices: PageSlice[]
  scale: number
}

export function useResumePreviewMetrics({
  isFixedA4Preview,
  isPagedA4Preview,
  measureRef,
  stageRef,
  watchKey,
}: {
  isFixedA4Preview: boolean
  isPagedA4Preview: boolean
  measureRef: React.RefObject<HTMLElement | null>
  stageRef: React.RefObject<HTMLDivElement | null>
  watchKey: string
}) {
  const [previewMetrics, setPreviewMetrics] = useState<ResumePreviewMetrics>({
    scale: 1,
    contentHeight: A4_PREVIEW_HEIGHT_PX,
    pageSlices: createDefaultPageSlices(),
  })

  useEffect(() => {
    const stageElement = stageRef.current
    const measureElement = measureRef.current

    if (!stageElement || !measureElement) {
      return
    }

    const updateMetrics = () => {
      const stageWidth = stageElement.clientWidth || A4_PREVIEW_WIDTH_PX
      const widthScale = stageWidth / A4_PREVIEW_WIDTH_PX
      const nextScale = isPagedA4Preview
        ? Math.min(1, widthScale)
        : isFixedA4Preview
          ? Math.min(1, widthScale, (stageElement.clientHeight || A4_PREVIEW_HEIGHT_PX) / A4_PREVIEW_HEIGHT_PX)
          : Math.min(1, widthScale)
      const nextContentHeight = Math.max(A4_PREVIEW_HEIGHT_PX, measureElement.scrollHeight)
      const nextPageSlices = isPagedA4Preview
        ? createPagedPreviewSlices(nextContentHeight, readMeasuredPageItems(measureElement), A4_PREVIEW_CONTINUATION_TOP_SPACING_PX)
        : createSinglePageSlice(nextContentHeight)

      setPreviewMetrics((current) => {
        if (
          Math.abs(current.scale - nextScale) < 0.001 &&
          current.contentHeight === nextContentHeight &&
          arePageSlicesEqual(current.pageSlices, nextPageSlices)
        ) {
          return current
        }

        return {
          scale: nextScale,
          contentHeight: nextContentHeight,
          pageSlices: nextPageSlices,
        }
      })
    }

    updateMetrics()

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics()
    })

    resizeObserver.observe(stageElement)
    resizeObserver.observe(measureElement)
    window.addEventListener('resize', updateMetrics)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateMetrics)
    }
  }, [isFixedA4Preview, isPagedA4Preview, measureRef, stageRef, watchKey])

  return previewMetrics
}
