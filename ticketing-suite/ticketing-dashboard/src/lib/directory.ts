/**
 * Directory API Layer (Notion Backend)
 * 
 * Provides directory services for sites, users, issue types, and field definitions.
 * Uses the Notion Edge Function proxy for all operations.
 */

const API_BASE = '/api/notion'

// Helper function for API requests
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  return response.json()
}

// ============ TYPES ============

export type SiteOpt = { id: string; name: string }

export type UserOpt = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  lastLoginAt?: string | null
  emailNotifications?: Record<string, boolean>
  plainPassword?: string
}

export type IssueTypeOpt = { key: string; label: string }

export type FieldDefOpt = {
  key: string
  label: string
  datatype: 'string' | 'number' | 'boolean' | 'date' | 'enum'
  required: boolean
  enumOptions?: string[]
  validation?: any
  uiHints?: any
  isIndexed?: boolean
}

// ============ LIST OPERATIONS ============

export const listSites = async (): Promise<SiteOpt[]> =>
  request<SiteOpt[]>('/sites')

export const listUsers = async (): Promise<UserOpt[]> =>
  request<UserOpt[]>('/users')

export const listIssueTypes = async (): Promise<IssueTypeOpt[]> =>
  request<IssueTypeOpt[]>('/types')

export const listFieldDefinitions = async (): Promise<FieldDefOpt[]> => {
  // Field definitions are not stored in Notion in Phase 1
  // Return empty array for now
  console.warn('Field definitions not yet implemented with Notion backend')
  return []
}

// ============ USER MANAGEMENT ============

export const updateUser = async (
  id: string,
  data: { name?: string; email?: string; role?: 'USER' | 'ADMIN' }
): Promise<UserOpt> =>
  request<UserOpt>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteUser = async (id: string): Promise<void> => {
  await request(`/users/${id}`, { method: 'DELETE' })
}

export const resetUserPassword = async (_id: string, _password: string): Promise<void> => {
  // Password management not applicable with shared token auth
  console.warn('Password reset not applicable with Notion backend (shared token auth)')
}

export const updateUserEmailNotifications = async (
  id: string,
  emailNotifications: Record<string, boolean>
): Promise<UserOpt> =>
  request<UserOpt>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ emailNotifications }),
  })

// ============ ISSUE TYPE MANAGEMENT ============

export const createIssueType = async (data: { key: string; label: string }): Promise<IssueTypeOpt> =>
  request<IssueTypeOpt>('/types', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateIssueType = async (
  id: string,
  data: { key?: string; label?: string; active?: boolean }
): Promise<IssueTypeOpt> =>
  request<IssueTypeOpt>(`/types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteIssueType = async (id: string): Promise<void> => {
  await request(`/types/${id}`, { method: 'DELETE' })
}

// ============ FIELD DEFINITION MANAGEMENT ============
// Not implemented in Phase 1 - these operations throw errors

export const createFieldDefinition = async (_data: {
  key: string
  label: string
  datatype: 'string' | 'number' | 'boolean' | 'date' | 'enum'
  required?: boolean
  enumOptions?: string[]
  validation?: any
  uiHints?: any
  isIndexed?: boolean
}): Promise<FieldDefOpt> => {
  throw new Error('Field definitions not yet implemented with Notion backend')
}

export const updateFieldDefinition = async (_id: string, _data: {
  label?: string
  required?: boolean
  enumOptions?: string[]
  validation?: any
  uiHints?: any
  isIndexed?: boolean
}): Promise<FieldDefOpt> => {
  throw new Error('Field definitions not yet implemented with Notion backend')
}

export const deleteFieldDefinition = async (_id: string): Promise<void> => {
  throw new Error('Field definitions not yet implemented with Notion backend')
}
