import { useEffect, useState } from 'react'
import { loadResumeTemplateCatalog } from '../api/templateCatalogApi'
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  type ResumeTemplateDefinition,
} from '../templateCatalog'

let cachedCatalog: ResumeTemplateDefinition[] | null = null
let catalogRequest: Promise<ResumeTemplateDefinition[]> | null = null

export function useResumeTemplateCatalog() {
  const [templates, setTemplates] = useState<ResumeTemplateDefinition[]>(
    cachedCatalog ?? FALLBACK_RESUME_TEMPLATE_CATALOG,
  )
  const [loading, setLoading] = useState(cachedCatalog == null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true

    void getSharedTemplateCatalog()
      .then((catalog) => {
        if (!active) {
          return
        }
        setTemplates(catalog)
        setError(null)
      })
      .catch((cause) => {
        if (!active) {
          return
        }
        setTemplates(FALLBACK_RESUME_TEMPLATE_CATALOG)
        setError(cause instanceof Error ? cause : new Error('Unable to load template catalog'))
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return {
    templates,
    loading,
    error,
  }
}

async function getSharedTemplateCatalog() {
  if (cachedCatalog) {
    return cachedCatalog
  }

  if (!catalogRequest) {
    catalogRequest = loadResumeTemplateCatalog().then((catalog) => {
      cachedCatalog = catalog
      return catalog
    })
  }

  return catalogRequest
}

export function replaceResumeTemplateCatalogCache(catalog: ResumeTemplateDefinition[]) {
  cachedCatalog = catalog
  catalogRequest = Promise.resolve(catalog)
}

export function invalidateResumeTemplateCatalogCache() {
  cachedCatalog = null
  catalogRequest = null
}
