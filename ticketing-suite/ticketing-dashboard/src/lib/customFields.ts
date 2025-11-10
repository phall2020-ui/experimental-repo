<<<<<<< HEAD
import type { FieldDefOpt } from './directory'
=======
import type { FieldDefOpt } from '../lib/directory'
>>>>>>> 74f08e7 (Align dashboard site column and custom field filtering)

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

