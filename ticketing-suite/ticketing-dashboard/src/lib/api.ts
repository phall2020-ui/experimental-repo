import axios from 'axios'
import type { TicketStatusValue } from './statuses'
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API_BASE })
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || ''
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
export interface Ticket {
  id: string
  siteId: string
  typeKey: string
  description: string
  status: TicketStatusValue
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  details?: string
  customFields?: Record<string, any>
  createdAt: string
  updatedAt: string
  assignedUserId?: string | null
  dueAt?: string | null
  firstResponseAt?: string | null
  resolvedAt?: string | null
}
export type TicketHistoryEntry = {
  id: string
  tenantId: string
  ticketId: string
  actorUserId?: string | null
  at: string
  changes: Record<string, { from: any; to: any }>
}
export const listTickets = async (params?: Record<string, any>) => {
  const cleanParams: Record<string, any> = {}
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleanParams[k] = v
    })
  }
  return (await client.get<Ticket[]>('/tickets', { params: cleanParams })).data
}
export const getTicket = async (id: string) => (await client.get<Ticket>(`/tickets/${id}`)).data
export const createTicket = async (data: {
  siteId: string
  type: string
  description: string
  status: Ticket['status']
  priority: Ticket['priority']
  details?: string
  assignedUserId?: string
  custom_fields?: Record<string, any>
}) => (await client.post<Ticket>('/tickets', data)).data

export interface RecurringTicketPayload {
  siteId: string
  originTicketId: string
  typeKey: string
  description: string
  priority: Ticket['priority']
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  intervalValue: number
  startDate: string
  endDate?: string
  leadTimeDays: number
  details?: string
  assignedUserId?: string
  customFields?: Record<string, any>
}

export const createRecurringTicket = async (data: RecurringTicketPayload) =>
  (await client.post('/recurring-tickets', data)).data
export interface RecurringTicketConfig {
  id: string
  originTicketId: string
  siteId: string
  typeKey: string
  description: string
  priority: Ticket['priority']
  details?: string
  assignedUserId?: string | null
  customFields: Record<string, any>
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  intervalValue: number
  startDate: string
  endDate?: string
  leadTimeDays: number
  isActive: boolean
  lastGeneratedAt?: string
  nextScheduledAt: string
  createdAt: string
  updatedAt: string
}

export const getRecurringTicketByOrigin = async (ticketId: string) =>
  (await client.get<RecurringTicketConfig>(`/recurring-tickets/by-origin/${ticketId}`)).data

export const updateRecurringTicket = async (id: string, data: Partial<RecurringTicketPayload> & { isActive?: boolean }) =>
  (await client.patch<RecurringTicketConfig>(`/recurring-tickets/${id}`, data)).data

export const listRecurringTickets = async (params?: { isActive?: boolean }) => {
  const cleanParams: Record<string, any> = {}
  if (params && params.isActive !== undefined) cleanParams.isActive = params.isActive
  return (await client.get<RecurringTicketConfig[]>('/recurring-tickets', { params: cleanParams })).data
}

export const bulkUpdateRecurringTickets = async (ids: string[], updates: Partial<RecurringTicketPayload> & { isActive?: boolean }) => {
  console.log('bulkUpdateRecurringTickets called with:', { ids, updates })
  return (await client.patch<{ updated: number }>('/recurring-tickets/bulk-update', { ids, updates })).data
}

export const bulkDeleteRecurringTickets = async (ids: string[]) => {
  console.log('bulkDeleteRecurringTickets called with:', { ids })
  return (await client.post<{ deleted: number }>('/recurring-tickets/bulk-delete', { ids })).data
}

export const bulkGroupRecurringTickets = async (ids: string[], groupName: string) => {
  console.log('bulkGroupRecurringTickets called with:', { ids, groupName })
  return (await client.patch<{ grouped: number, groupName: string }>('/recurring-tickets/bulk-group', { ids, groupName })).data
}

export const updateTicket = async (id: string, patch: Partial<Ticket> & { custom_fields?: any }) => (await client.patch<Ticket>(`/tickets/${id}`, patch)).data
export const bulkUpdateTickets = async (payload: {
  ids: string[]
  status?: Ticket['status']
  priority?: Ticket['priority']
  assignedUserId?: string | null
}) => (await client.patch<Ticket[]>('/tickets/bulk', payload)).data
export const bulkDeleteTickets = async (ids: string[]) =>
  (await client.delete<{ deleted: number }>('/tickets/bulk', { data: { ids } })).data
export const listTicketHistory = async (id: string) => (await client.get<TicketHistoryEntry[]>(`/tickets/${id}/history`)).data

// Comments API
export interface Comment {
  id: string
  ticketId: string
  body: string
  visibility: 'PUBLIC' | 'INTERNAL'
  createdAt: string
  userId?: string
}

export const listComments = async (ticketId: string) => (await client.get<Comment[]>(`/tickets/${ticketId}/comments`)).data
export const addComment = async (
  ticketId: string,
  body: string,
  visibility: 'PUBLIC' | 'INTERNAL' = 'INTERNAL',
  mentions: string[] = []
) => (await client.post<Comment>(`/tickets/${ticketId}/comments`, { body, visibility, mentions })).data
export const updateComment = async (ticketId: string, commentId: string, body: string) =>
  (await client.patch<Comment>(`/tickets/${ticketId}/comments/${commentId}`, { body })).data
export const deleteComment = async (ticketId: string, commentId: string) =>
  (await client.delete(`/tickets/${ticketId}/comments/${commentId}`)).data

// Attachments API
export interface Attachment {
  id: string
  ticketId: string
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  downloadUrl: string
}

export interface PresignResponse {
  url: string
  attachmentId: string
  fields: Record<string, string>
}

export const listAttachments = async (ticketId: string) =>
  (await client.get<Attachment[]>(`/tickets/${ticketId}/attachments`)).data

export const presignAttachment = async (ticketId: string, filename: string, mime: string) =>
  (await client.post<PresignResponse>(`/tickets/${ticketId}/attachments/presign`, { filename, mime })).data

export const finalizeAttachment = async (ticketId: string, attachmentId: string, size: number, checksumSha256: string) =>
  (await client.post<Attachment>(`/tickets/${ticketId}/attachments/${attachmentId}/finalize`, { size, checksumSha256 })).data

export const deleteAttachment = async (ticketId: string, attachmentId: string) =>
  (await client.delete(`/tickets/${ticketId}/attachments/${attachmentId}`)).data

// Health API
export interface HealthStatus {
  status: 'ok' | 'error'
  info?: Record<string, { status: string; [key: string]: any }>
  error?: Record<string, { status: string; message?: string }>
  details?: Record<string, any>
}

export const getHealth = async () => (await client.get<HealthStatus>('/health')).data
export const getHealthDb = async () => (await client.get<HealthStatus>('/health/db')).data
export const getHealthRedis = async () => (await client.get<HealthStatus>('/health/redis')).data

// Site Management API
export interface Site {
  id: string
  name: string
  location?: string | null
}

export const listSitesDetailed = async () => (await client.get<Site[]>('/directory/sites')).data
export const createSite = async (data: { name: string; location?: string }) =>
  (await client.post<Site>('/directory/sites', data)).data
export const updateSite = async (id: string, data: { name?: string; location?: string }) =>
  (await client.patch<Site>(`/directory/sites/${id}`, data)).data
export const deleteSite = async (id: string) => (await client.delete(`/directory/sites/${id}`)).data

// Features API
export interface Features {
  search: boolean
  attachments: boolean
}

export const getFeatures = async () => (await client.get<Features>('/features')).data
