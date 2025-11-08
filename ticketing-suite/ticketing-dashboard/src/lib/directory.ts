import axios from 'axios'
const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API })
client.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export type SiteOpt = { id: string; name: string }
export type UserOpt = { id: string; name: string; email: string; role: 'ADMIN' | 'USER' }
export type IssueTypeOpt = { key: string; label: string }

export const listSites = async () => (await client.get<SiteOpt[]>('/directory/sites')).data
export const listUsers = async () => (await client.get<UserOpt[]>('/directory/users')).data
export const listIssueTypes = async () => (await client.get<IssueTypeOpt[]>('/directory/issue-types')).data
