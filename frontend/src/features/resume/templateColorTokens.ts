/**
 * Helpers for parsing and stringifying the limited subset of CSS color values
 * that the template visual editor supports.
 *
 * The editor only handles two-stop `linear-gradient(<angle>deg, <from>, <to>)`
 * strings. Anything else (conic gradients, CSS vars, multi-stop gradients,
 * named colors that AntD's ColorPicker can't parse, etc.) should be left as
 * a read-only string by the caller.
 */

export interface LinearGradientParts {
  from: string
  to: string
  angleDeg: number
}

const ANGLE_PATTERN = /^(-?\d+(?:\.\d+)?)deg$/i
const TO_DIRECTION_PATTERN = /^to\s+(.+)$/i

function splitTopLevelByComma(input: string): string[] {
  const result: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (ch === '(') {
      depth += 1
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1)
    } else if (ch === ',' && depth === 0) {
      result.push(input.slice(start, i))
      start = i + 1
    }
  }
  result.push(input.slice(start))
  return result
}

function directionToAngle(value: string): number | null {
  const match = TO_DIRECTION_PATTERN.exec(value)
  if (!match) {
    return null
  }
  const direction = match[1].trim().toLowerCase().replace(/\s+/g, ' ')
  switch (direction) {
    case 'top':
      return 0
    case 'right':
      return 90
    case 'bottom':
      return 180
    case 'left':
      return 270
    case 'top right':
    case 'right top':
      return 45
    case 'bottom right':
    case 'right bottom':
      return 135
    case 'bottom left':
    case 'left bottom':
      return 225
    case 'top left':
    case 'left top':
      return 315
    default:
      return null
  }
}

function stripPercentSuffix(stop: string): string {
  // Drops a trailing `<n>%` color stop position so we keep the bare color string.
  return stop.replace(/\s+-?\d+(?:\.\d+)?%\s*$/, '').trim()
}

function normalizeAngle(value: number): number {
  const wrapped = ((value % 360) + 360) % 360
  return Math.round(wrapped)
}

/**
 * Parse a CSS `linear-gradient(...)` string with exactly two color stops.
 * Returns null for any value the editor can't safely round-trip (multi-stop
 * gradients, conic/radial gradients, plain color values, etc.).
 */
export function parseLinearGradient(value: string): LinearGradientParts | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  const wrapper = /^linear-gradient\(\s*([\s\S]*)\s*\)$/i.exec(trimmed)
  if (!wrapper) {
    return null
  }

  const inner = wrapper[1].trim()
  const parts = splitTopLevelByComma(inner).map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2 || parts.length > 3) {
    return null
  }

  let angleDeg = 180 // CSS default when angle/direction is omitted is "to bottom".
  let stopParts: string[]

  if (parts.length === 3) {
    const angleMatch = ANGLE_PATTERN.exec(parts[0])
    if (angleMatch) {
      angleDeg = normalizeAngle(parseFloat(angleMatch[1]))
    } else {
      const directional = directionToAngle(parts[0])
      if (directional === null) {
        return null
      }
      angleDeg = directional
    }
    stopParts = [parts[1], parts[2]]
  } else {
    stopParts = parts
  }

  const from = stripPercentSuffix(stopParts[0])
  const to = stripPercentSuffix(stopParts[1])
  if (!from || !to) {
    return null
  }

  return { from, to, angleDeg }
}

/**
 * Compose a two-stop linear gradient string from its parts. The output format
 * mirrors the values stored in the built-in template catalog so round-tripping
 * is byte-exact for those templates.
 */
export function stringifyLinearGradient(parts: LinearGradientParts): string {
  const angle = normalizeAngle(parts.angleDeg)
  return `linear-gradient(${angle}deg, ${parts.from}, ${parts.to})`
}

/**
 * Loose check used by the editor to decide whether AntD's ColorPicker can
 * safely consume a value. Anything else falls back to a read-only Input.
 */
export function isLikelySingleColor(value: string): boolean {
  if (typeof value !== 'string') {
    return false
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return true
  }
  return /^(rgba?|hsla?|hsva?|hsba?)\s*\([^)]*\)$/i.test(trimmed)
}
