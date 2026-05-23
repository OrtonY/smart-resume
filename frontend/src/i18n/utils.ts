/**
 * Resolves a field that may be either a plain string or a locale-keyed object.
 *
 * - If `field` is a string, returns it directly.
 * - If `field` is an object with locale keys (e.g. `{ "zh-CN": "...", "en-US": "..." }`
 *   or shorthand `{ zh: "...", en: "..." }`), returns the value matching `locale`.
 *   Falls back to zh-CN / zh, then the first available value.
 */
export function getLocalizedField(
  field: string | Record<string, string>,
  locale: string,
): string {
  if (typeof field === 'string') {
    return field
  }

  // Direct match (e.g. "zh-CN" or "en-US")
  if (field[locale]) {
    return field[locale]
  }

  // Shorthand match (e.g. locale "zh-CN" -> try "zh"; "en-US" -> try "en")
  const shortLocale = locale.split('-')[0]
  if (shortLocale && field[shortLocale]) {
    return field[shortLocale]
  }

  // Fallback: zh-CN -> zh -> first available value
  if (field['zh-CN']) return field['zh-CN']
  if (field['zh']) return field['zh']

  const values = Object.values(field)
  return values[0] ?? ''
}
