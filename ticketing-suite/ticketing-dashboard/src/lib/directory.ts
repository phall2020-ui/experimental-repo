import axios from 'axios'
const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API })
client.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export type SiteOpt = { id: string; name: string }
export type UserOpt = { 
  id: string; 
  name: string; 
  email: string; 
  role: 'ADMIN' | 'USER'; 
  lastLoginAt?: string | null;
  emailNotifications?: Record<string, boolean>;
  plainPassword?: string;
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

export const listSites = async () => (await client.get<SiteOpt[]>('/directory/sites')).data
export const listUsers = async () => (await client.get<UserOpt[]>('/directory/users')).data
export const listIssueTypes = async () => (await client.get<IssueTypeOpt[]>('/directory/issue-types')).data
export const listFieldDefinitions = async () => (await client.get<FieldDefOpt[]>('/directory/field-definitions')).data

// User management
export const updateUser = async (id: string, data: { name?: string; email?: string; role?: 'USER' | 'ADMIN' }) =>
  (await client.patch(`/users/${id}`, data)).data
export const deleteUser = async (id: string) =>
  (await client.delete(`/users/${id}`)).data
export const resetUserPassword = async (id: string, password: string) =>
  (await client.post(`/users/${id}/reset-password`, { password })).data
export const updateUserEmailNotifications = async (id: string, emailNotifications: Record<string, boolean>) =>
  (await client.patch(`/users/${id}/email-notifications`, { emailNotifications })).data

// Issue type management
export const createIssueType = async (data: { key: string; label: string }) =>
  (await client.post('/directory/issue-types', data)).data
export const updateIssueType = async (id: string, data: { key?: string; label?: string; active?: boolean }) =>
  (await client.patch(`/directory/issue-types/${id}`, data)).data
export const deleteIssueType = async (id: string) =>
  (await client.delete(`/directory/issue-types/${id}`)).data

// Field definition management
export const createFieldDefinition = async (data: {
  key: string
  label: string
  datatype: 'string' | 'number' | 'boolean' | 'date' | 'enum'
  required?: boolean
  enumOptions?: string[]
  validation?: any
  uiHints?: any
  isIndexed?: boolean
}) => (await client.post('/directory/field-definitions', data)).data

export const updateFieldDefinition = async (id: string, data: {
  label?: string
  required?: boolean
  enumOptions?: string[]
  validation?: any
  uiHints?: any
  isIndexed?: boolean
}) => (await client.patch(`/directory/field-definitions/${id}`, data)).data

export const deleteFieldDefinition = async (id: string) =>
  (await client.delete(`/directory/field-definitions/${id}`)).data
