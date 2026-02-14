import type { FieldDefOpt } from './directory'

const EXCLUDED_CUSTOM_FIELDS = ['environment', 'estimated_hours']

export const filterFieldDefs = (defs: FieldDefOpt[]): FieldDefOpt[] =>
  defs.filter(def => !EXCLUDED_CUSTOM_FIELDS.includes(def.key))

export const sanitizeCustomFieldValues = <T extends Record<string, any> | undefined>(
  values: T
): Record<string, any> => {
  if (!values) return {}
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !EXCLUDED_CUSTOM_FIELDS.includes(key))
  )
}

