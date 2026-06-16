import { App } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useIsMobile } from '../../../lib/hooks/useIsMobile'
import {
  createResumeTemplate,
  deleteResumeTemplate,
  listManagedResumeTemplates,
  updateResumeTemplate,
} from '../api/templateCatalogApi'
import { createResume, getResume, importResume, updateResume } from '../api/resumeApi'
import { replaceManagedResumeTemplateCatalogCache } from './useResumeTemplateCatalog'
import { getLocalizedField, type ManagedResumeTemplateDefinition, type ResumeTemplatePreview, type ResumeTemplateTheme } from '../templateCatalog'
import type { ResumeDetail } from '../types'
import {
  buildPreviewResume,
  chooseTemplateKey,
  cloneManagedTemplate,
  createNewTemplateDraft,
  type EditorMode,
  FALLBACK_MANAGED_TEMPLATE,
  getDefaultManagedTemplate,
  serializeTemplateDraft,
  toUpdatePayload,
  validateTemplateDraft,
} from '../templateGalleryUtils'

export function useTemplateGalleryController() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation('template')
  const locale = i18n.language
  const isMobile = useIsMobile()
  const resumeId = searchParams.get('resumeId') ?? ''
  const { message } = App.useApp()
  const [templates, setTemplates] = useState<ManagedResumeTemplateDefinition[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError, setTemplateError] = useState<Error | null>(null)
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loadingResume, setLoadingResume] = useState(Boolean(resumeId))
  const [resumeError, setResumeError] = useState<Error | null>(null)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('')
  const [selectionTouched, setSelectionTouched] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('preview')
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [editorDraft, setEditorDraft] = useState<ManagedResumeTemplateDefinition | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [applyingTemplateKey, setApplyingTemplateKey] = useState<string | null>(null)
  const [deletingTemplateKey, setDeletingTemplateKey] = useState<string | null>(null)
  const [creatingResumeTemplateKey, setCreatingResumeTemplateKey] = useState<string | null>(null)
  const [importingResumeTemplateKey, setImportingResumeTemplateKey] = useState<string | null>(null)
  const isResumeTemplateChange = Boolean(resumeId)

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.key === selectedTemplateKey) ?? getDefaultManagedTemplate(templates),
    [selectedTemplateKey, templates],
  )

  const previewTemplate = editorDraft ?? selectedTemplate ?? FALLBACK_MANAGED_TEMPLATE
  const previewResume = useMemo(() => buildPreviewResume(resume, previewTemplate.key), [previewTemplate.key, resume])
  const linkedTemplate = resume ? templates.find((item) => item.key === resume.templateKey) : null
  const linkedTemplateName = resume
    ? linkedTemplate
      ? getLocalizedField(linkedTemplate.name, locale)
      : resume.templateKey
    : null

  const draftDirty = useMemo(() => {
    if (!editorDraft) {
      return false
    }

    if (editorMode === 'create') {
      return true
    }

    if (!selectedTemplate) {
      return false
    }

    return serializeTemplateDraft(editorDraft) !== serializeTemplateDraft(selectedTemplate)
  }, [editorDraft, editorMode, selectedTemplate])

  const canApplyTemplate = Boolean(
    resume && editorMode === 'edit' && selectedTemplate && resume.templateKey !== selectedTemplate.key,
  )

  const syncTemplates = useCallback((nextTemplates: ManagedResumeTemplateDefinition[], preferredKey?: string) => {
    setTemplates(nextTemplates)
    replaceManagedResumeTemplateCatalogCache(nextTemplates)
    setSelectedTemplateKey((current) =>
      chooseTemplateKey(nextTemplates, {
        current,
        preferred: preferredKey,
        resumeKey: !selectionTouched ? resume?.templateKey : undefined,
      }),
    )
  }, [resume?.templateKey, selectionTouched])

  const loadTemplateCatalog = useCallback(async (preferredKey?: string) => {
    setLoadingTemplates(true)
    try {
      const catalog = await listManagedResumeTemplates()
      syncTemplates(catalog, preferredKey)
      setTemplateError(null)
    } catch (error) {
      setTemplateError(error instanceof Error ? error : new Error(t('gallery.error.loadCatalog')))
    } finally {
      setLoadingTemplates(false)
    }
  }, [syncTemplates, t])

  const loadResume = useCallback(async () => {
    if (!resumeId) {
      setResume(null)
      setLoadingResume(false)
      setResumeError(null)
      return
    }

    setLoadingResume(true)
    try {
      const detail = await getResume(resumeId)
      setResume(detail)
      setResumeError(null)
    } catch (error) {
      setResume(null)
      setResumeError(error instanceof Error ? error : new Error(t('gallery.error.loadResume')))
    } finally {
      setLoadingResume(false)
    }
  }, [resumeId, t])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTemplateCatalog()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadTemplateCatalog])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResume()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadResume])

  useEffect(() => {
    if (editorMode !== 'edit') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setEditorDraft(selectedTemplate ? cloneManagedTemplate(selectedTemplate) : null)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [editorMode, selectedTemplate])

  useEffect(() => {
    if (!selectionTouched && resume?.templateKey) {
      const timeoutId = window.setTimeout(() => {
        setSelectedTemplateKey(resume.templateKey)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [resume?.templateKey, selectionTouched])

  function handleTemplateSelect(nextTemplateKey: string) {
    if (nextTemplateKey === selectedTemplateKey && editorMode === 'edit') {
      return
    }
    setSelectionTouched(true)
    setEditorMode('edit')
    setSelectedTemplateKey(nextTemplateKey)
    setEditorDraft(null)
  }

  async function handleCreateResumeFromTemplate(templateKey: string) {
    const template = templates.find((item) => item.key === templateKey)
    setCreatingResumeTemplateKey(templateKey)
    try {
      const templateName = template ? getLocalizedField(template.name, locale) : t('gallery.draft.untitledResume')
      const detail = await createResume({
        title: template ? t('gallery.draft.defaultResumeName', { name: templateName }) : t('gallery.draft.untitledResume'),
        templateKey,
      })
      void message.success(t('gallery.message.resumeCreated'))
      navigate(`/app/resumes/${detail.id}`)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.createResumeFailed'))
    } finally {
      setCreatingResumeTemplateKey(null)
    }
  }

  async function handleImportResumeFromTemplate(templateKey: string, file: File) {
    setImportingResumeTemplateKey(templateKey)
    try {
      const detail = await importResume(file, templateKey)
      void message.success(t('gallery.message.resumeImported'))
      navigate(`/app/resumes/${detail.id}`)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.importResumeFailed'))
    } finally {
      setImportingResumeTemplateKey(null)
    }
  }
  function handleCreateFromCurrent() {
    setSelectionTouched(true)
    setEditorMode('create')
    setEditorDraft(createNewTemplateDraft(selectedTemplate, templates, t, locale))
    if (isMobile) {
      setMobileExpanded(true)
      setMobileView('edit')
    }
  }

  function handleCancelCreate() {
    setEditorMode('edit')
    setEditorDraft(selectedTemplate ? cloneManagedTemplate(selectedTemplate) : null)
  }

  async function handleSaveTemplate() {
    if (!editorDraft) {
      return
    }

    const validationMessage = validateTemplateDraft(editorDraft, editorMode, t)
    if (validationMessage) {
      void message.error(validationMessage)
      return
    }

    setSavingTemplate(true)
    try {
      if (editorMode === 'create') {
        await createResumeTemplate({
          key: editorDraft.key,
          ...toUpdatePayload(editorDraft),
        })
        await loadTemplateCatalog(editorDraft.key)
        setEditorMode('edit')
        void message.success(t('gallery.message.templateCreated'))
      } else if (selectedTemplate) {
        await updateResumeTemplate(selectedTemplate.key, toUpdatePayload(editorDraft))
        await loadTemplateCatalog(selectedTemplate.key)
        void message.success(t('gallery.message.templateUpdated'))
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.templateSaveFailed'))
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplate || selectedTemplate.builtIn) {
      return
    }

    setDeletingTemplateKey(selectedTemplate.key)
    try {
      await deleteResumeTemplate(selectedTemplate.key)
      await loadTemplateCatalog()
      setEditorMode('edit')
      void message.success(t('gallery.message.templateDeleted'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.templateDeleteFailed'))
    } finally {
      setDeletingTemplateKey(null)
    }
  }

  async function handleApplyTemplateToResume() {
    if (!resume || !selectedTemplate) {
      return
    }

    setApplyingTemplateKey(selectedTemplate.key)
    try {
      const updated = await updateResume(resume.id, {
        title: resume.title,
        templateKey: selectedTemplate.key,
        content: resume.content,
        layout: resume.layout,
      })
      setResume(updated)
      void message.success(t('gallery.message.templateApplied'))
    } catch (error) {
      void message.error(error instanceof Error ? error.message : t('gallery.message.templateApplyFailed'))
    } finally {
      setApplyingTemplateKey(null)
    }
  }

  function updateDraftField<K extends keyof ManagedResumeTemplateDefinition>(
    field: K,
    value: ManagedResumeTemplateDefinition[K],
  ) {
    setEditorDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  function updateDraftTheme<K extends keyof ResumeTemplateTheme>(field: K, value: string) {
    setEditorDraft((current) =>
      current
        ? {
            ...current,
            theme: {
              ...current.theme,
              [field]: value,
            },
          }
        : current,
    )
  }

  function updateDraftPreview<K extends keyof ResumeTemplatePreview>(field: K, value: string) {
    setEditorDraft((current) =>
      current
        ? {
            ...current,
            preview: {
              ...current.preview,
              [field]: value,
            },
          }
        : current,
    )
  }

  return {
    applyingTemplateKey,
    canApplyTemplate,
    creatingResumeTemplateKey,
    deletingTemplateKey,
    draftDirty,
    editorDraft,
    editorMode,
    handleApplyTemplateToResume,
    handleCancelCreate,
    handleCreateFromCurrent,
    handleCreateResumeFromTemplate,
    handleImportResumeFromTemplate,
    handleDeleteTemplate,
    handleSaveTemplate,
    handleTemplateSelect,
    importingResumeTemplateKey,
    isMobile,
    isResumeTemplateChange,
    linkedTemplateName,
    loadTemplateCatalog,
    loadingResume,
    loadingTemplates,
    locale,
    mobileExpanded,
    mobileView,
    navigate,
    previewResume,
    previewTemplate,
    resume,
    resumeError,
    savingTemplate,
    selectedTemplate,
    setMobileExpanded,
    setMobileView,
    templateError,
    templates,
    updateDraftField,
    updateDraftPreview,
    updateDraftTheme,
  }
}
