import axios from 'axios'
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
  status: 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED'
  priority: 'P1' | 'P2' | 'P3' | 'P4'
  details?: string
  customFields?: Record<string, any>
  createdAt: string
  updatedAt: string
  assignedUserId?: string | null
}
export type TicketHistoryEntry = {
  id: string
  tenantId: string
  ticketId: string
  actorUserId?: string | null
  at: string
  changes: Record<string, { from: any; to: any }>
}
export const listTickets = async (params?: Record<string, any>) => (await client.get<Ticket[]>('/tickets', { params })).data
export const getTicket = async (id: string) => (await client.get<Ticket>(`/tickets/${id}`)).data
export const updateTicket = async (id: string, patch: Partial<Ticket> & { custom_fields?: any }) => (await client.patch<Ticket>(`/tickets/${id}`, patch)).data
export const listTicketHistory = async (id: string) => (await client.get<TicketHistoryEntry[]>(`/tickets/${id}/history`)).data
