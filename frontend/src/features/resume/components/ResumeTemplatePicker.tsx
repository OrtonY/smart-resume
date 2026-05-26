import { useTranslation } from 'react-i18next'
import {
  createTemplateStyleVariables,
  getLocalizedField,
  type ResumeTemplateDefinition,
} from '../templateCatalog'

interface ResumeTemplatePickerProps {
  templates: ResumeTemplateDefinition[]
  value: string
  onChange: (key: string) => void
  compact?: boolean
  ariaLabel?: string
}

export function ResumeTemplatePicker({
  templates,
  value,
  onChange,
  compact = false,
  ariaLabel,
}: ResumeTemplatePickerProps) {
  const { t, i18n } = useTranslation('template')
  const locale = i18n.language
  const resolvedAriaLabel = ariaLabel ?? t('picker.ariaLabel')

  return (
    <div
      className={`template-picker${compact ? ' template-picker--compact' : ''}`}
      role="radiogroup"
      aria-label={resolvedAriaLabel}
    >
      {templates.map((template) => {
        const selected = template.key === value

        return (
          <button
            key={template.key}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`template-card template-card--${template.layout}${selected ? ' is-selected' : ''}`}
            style={createTemplateStyleVariables(template)}
            onClick={() => onChange(template.key)}
          >
            <div className="template-card__preview" aria-hidden="true">
              <div className={`template-card__sheet template-card__sheet--${template.layout}`}>
                <div className="template-card__band template-card__band--hero" />
                <div className="template-card__band template-card__band--aside" />
                <div className="template-card__layout template-card__layout--primary">
                  <span className="template-card__line template-card__line--wide" />
                  <span className="template-card__line" />
                  <span className="template-card__line" />
                  <span className="template-card__line template-card__line--short" />
                </div>
                <div className="template-card__layout template-card__layout--secondary">
                  <span className="template-card__line" />
                  <span className="template-card__line template-card__line--short" />
                  <span className="template-card__line" />
                </div>
              </div>
            </div>

            <div className="template-card__body">
              <div className="template-card__topline">
                <span className="template-card__category">{getLocalizedField(template.category, locale)}</span>
                {selected ? <span className="template-card__selected">{t('picker.currentTag')}</span> : null}
              </div>
              <strong>{getLocalizedField(template.name, locale)}</strong>
              <p>{getLocalizedField(template.summary, locale)}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
