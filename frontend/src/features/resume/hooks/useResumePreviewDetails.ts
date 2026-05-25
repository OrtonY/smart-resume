import { useEffect, useMemo, useState } from 'react'
import { getResume } from '../api/resumeApi'
import { normalizeResumeLayout, type ResumeDetail, type ResumeSummary } from '../types'

export function useResumePreviewDetails(resumeList: ResumeSummary[]) {
  const [previewDetailsByResumeId, setPreviewDetailsByResumeId] = useState<Record<string, ResumeDetail>>({})
  const visibleResumeIds = useMemo(() => resumeList.map((item) => item.id), [resumeList])
  const loadingPreviewIds = visibleResumeIds.filter((id) => !previewDetailsByResumeId[id])

  useEffect(() => {
    const missingResumes = resumeList.filter((item) => !previewDetailsByResumeId[item.id])
    if (missingResumes.length === 0) {
      return
    }

    let cancelled = false
    const missingIds = missingResumes.map((item) => item.id)

    Promise.allSettled(missingIds.map((id) => getResume(id))).then((results) => {
      if (cancelled) {
        return
      }

      const loadedDetails = results.reduce<Record<string, ResumeDetail>>((next, result) => {
        if (result.status === 'fulfilled') {
          next[result.value.id] = {
            ...result.value,
            layout: normalizeResumeLayout(result.value.layout),
          }
        }
        return next
      }, {})

      if (Object.keys(loadedDetails).length > 0) {
        setPreviewDetailsByResumeId((current) => ({
          ...current,
          ...loadedDetails,
        }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [previewDetailsByResumeId, resumeList])

  return {
    loadingPreviewIds,
    previewDetailsByResumeId,
  }
}
