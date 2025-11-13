import axios from 'axios'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API })

client.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export type TicketTemplate = {
  id: string
  tenantId: string
  name: string
  typeKey: string
  description: string
  details?: string
  priority: string
  status: string
  assignedUserId?: string
  customFields: Record<string, any>
  isRecurring: boolean
  frequency?: string
  intervalValue?: number
  leadTimeDays?: number
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export const createTemplate = async (data: Omit<TicketTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) =>
  (await client.post<TicketTemplate>('/templates', data)).data

export const listTemplates = async () =>
  (await client.get<TicketTemplate[]>('/templates')).data

export const getTemplate = async (id: string) =>
  (await client.get<TicketTemplate>(`/templates/${id}`)).data

export const deleteTemplate = async (id: string) =>
  (await client.delete(`/templates/${id}`)).data
