import { UndoOutlined } from '@ant-design/icons'
import { Button, ColorPicker, Input, Slider, Tooltip, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  parseLinearGradient,
  stringifyLinearGradient,
  type LinearGradientParts,
} from '../templateColorTokens'

const { Text } = Typography

interface GradientFieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  onReset?: () => void
  canReset: boolean
}

/**
 * Visual editor for a two-stop linear gradient. The editor is locked to the
 * `linear-gradient(<angle>deg, <from>, <to>)` form. To approximate a solid
 * color, the user sets both stops to the same color.
 *
 * If `value` cannot be parsed as a 2-stop linear gradient (for example
 * `pure-form` template's `preview.heroBackground` is a solid `#eef2f7`), we
 * fall back to a read-only Input rather than silently coercing the value
 * into a gradient with two identical stops, which would mutate the data.
 */
export function GradientField({ label, value, onChange, onReset, canReset }: GradientFieldProps) {
  const { t } = useTranslation('template')
  const parsed = useMemo(() => parseLinearGradient(value), [value])

  function emit(next: LinearGradientParts) {
    onChange(stringifyLinearGradient(next))
  }

  return (
    <div className="template-editor-field template-editor-field--span-2">
      <div className="template-editor-field__label-row">
        <Text type="secondary">{label}</Text>
        {canReset && onReset ? (
          <Tooltip title={t('gradient.resetTooltip')}>
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              aria-label={t('gradient.resetAriaLabel', { label })}
              onClick={onReset}
            />
          </Tooltip>
        ) : null}
      </div>

      {parsed ? (
        <div className="template-editor-gradient">
          <div
            className="template-editor-gradient__preview"
            aria-hidden="true"
            style={{ background: value }}
          />
          <div className="template-editor-gradient__stops">
            <div className="template-editor-gradient__row">
              <Text type="secondary" className="template-editor-gradient__row-label">
                {t('gradient.startColor')}
              </Text>
              <ColorPicker
                value={parsed.from}
                showText
                format="rgb"
                allowClear={false}
                onChange={(color) => emit({ ...parsed, from: color.toRgbString() })}
              />
            </div>
            <div className="template-editor-gradient__row">
              <Text type="secondary" className="template-editor-gradient__row-label">
                {t('gradient.endColor')}
              </Text>
              <ColorPicker
                value={parsed.to}
                showText
                format="rgb"
                allowClear={false}
                onChange={(color) => emit({ ...parsed, to: color.toRgbString() })}
              />
            </div>
            <div className="template-editor-gradient__row">
              <Text type="secondary" className="template-editor-gradient__row-label">
                {t('gradient.angle', { degrees: parsed.angleDeg })}
              </Text>
              <Slider
                min={0}
                max={360}
                value={parsed.angleDeg}
                onChange={(angle) => emit({ ...parsed, angleDeg: typeof angle === 'number' ? angle : parsed.angleDeg })}
              />
            </div>
          </div>
        </div>
      ) : (
        <Input
          value={value}
          readOnly
          placeholder={t('gradient.fallbackPlaceholder')}
        />
      )}
    </div>
  )
}
