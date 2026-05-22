import { useEffect, useState } from 'react'
import { listManagedResumeTemplates, loadResumeTemplateCatalog } from '../api/templateCatalogApi'
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  type ManagedResumeTemplateDefinition,
  type ResumeTemplateDefinition,
} from '../templateCatalog'

export type ResumeTemplateCatalogScope = 'public' | 'managed'

let cachedPublicCatalog: ResumeTemplateDefinition[] | null = null
let publicCatalogRequest: Promise<ResumeTemplateDefinition[]> | null = null
let cachedManagedCatalog: ManagedResumeTemplateDefinition[] | null = null
let managedCatalogRequest: Promise<ManagedResumeTemplateDefinition[]> | null = null

interface UseResumeTemplateCatalogOptions {
  scope?: ResumeTemplateCatalogScope
}

export function useResumeTemplateCatalog(options: UseResumeTemplateCatalogOptions = {}) {
  const scope = options.scope ?? 'public'
  const initialCatalog = scope === 'managed' ? cachedManagedCatalog : cachedPublicCatalog
  const [templates, setTemplates] = useState<ResumeTemplateDefinition[]>(
    initialCatalog ?? FALLBACK_RESUME_TEMPLATE_CATALOG,
  )
  const [loading, setLoading] = useState(initialCatalog == null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true

    void getTemplateCatalog(scope)
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
  }, [scope])

  return {
    templates,
    loading,
    error,
  }
}

async function getTemplateCatalog(scope: ResumeTemplateCatalogScope) {
  if (scope === 'managed') {
    if (cachedManagedCatalog) {
      return cachedManagedCatalog
    }

    if (!managedCatalogRequest) {
      managedCatalogRequest = listManagedResumeTemplates().then((catalog) => {
        cachedManagedCatalog = catalog
        return catalog
      })
    }

    return managedCatalogRequest
  }

  if (cachedPublicCatalog) {
    return cachedPublicCatalog
  }

  if (!publicCatalogRequest) {
    publicCatalogRequest = loadResumeTemplateCatalog().then((catalog) => {
      cachedPublicCatalog = catalog
      return catalog
    })
  }

  return publicCatalogRequest
}

export function replaceManagedResumeTemplateCatalogCache(catalog: ManagedResumeTemplateDefinition[]) {
  cachedManagedCatalog = catalog
  managedCatalogRequest = Promise.resolve(catalog)
}

export function invalidateManagedResumeTemplateCatalogCache() {
  cachedManagedCatalog = null
  managedCatalogRequest = null
}
