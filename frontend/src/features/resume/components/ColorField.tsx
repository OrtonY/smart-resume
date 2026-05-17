import { UndoOutlined } from '@ant-design/icons'
import { Button, ColorPicker, Input, Tooltip, Typography } from 'antd'
import { isLikelySingleColor } from '../templateColorTokens'

const { Text } = Typography

interface ColorFieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  onReset?: () => void
  canReset: boolean
}

/**
 * Visual editor for a single color/transparency token. Always emits the value
 * back as `rgba(r, g, b, a)` so storage stays consistent. If the incoming
 * `value` isn't a format AntD's ColorPicker can read (e.g. a CSS variable or
 * a stray gradient), we fall back to a plain text input so we don't silently
 * overwrite the user's data.
 */
export function ColorField({ label, value, onChange, onReset, canReset }: ColorFieldProps) {
  const editable = isLikelySingleColor(value)

  return (
    <div className="template-editor-field">
      <div className="template-editor-field__label-row">
        <Text type="secondary">{label}</Text>
        {canReset && onReset ? (
          <Tooltip title="撤销该字段未保存的修改">
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              aria-label={`重置${label}`}
              onClick={onReset}
            />
          </Tooltip>
        ) : null}
      </div>
      {editable ? (
        <ColorPicker
          value={value}
          showText
          format="rgb"
          allowClear={false}
          onChange={(color) => onChange(color.toRgbString())}
        />
      ) : (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="无法识别为颜色，可手动编辑"
        />
      )}
    </div>
  )
}
