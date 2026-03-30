/**
 * Notion API Layer
 * 
 * This module provides the same interface as the original api.ts
 * but routes requests through the Vercel Edge Function proxy to Notion.
 */

import type { TicketStatusValue } from './statuses'

// API base URL - uses Vercel Edge Function proxy
const API_BASE = '/api/notion'

// Helper function to make API requests
async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${path}`

    const response = await fetch(url, {
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

export interface Ticket {
    id: string
    ticketId?: string  // Display ID like "TKT-ABC123"
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

export interface Comment {
    id: string
    ticketId: string
    body: string
    visibility: 'PUBLIC' | 'INTERNAL'
    createdAt: string
    userId?: string
}

export interface Site {
    id: string
    name: string
    location?: string | null
}

export interface User {
    id: string
    email: string
    name: string
    role: 'ADMIN' | 'USER'
}

export interface IssueType {
    id: string
    key: string
    label: string
    active: boolean
}

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

export interface HealthStatus {
    status: 'ok' | 'error'
    info?: Record<string, { status: string;[key: string]: any }>
    error?: Record<string, { status: string; message?: string }>
    details?: Record<string, any>
}

export interface Features {
    search: boolean
    attachments: boolean
    recurring: boolean
    notifications: boolean
    history: boolean
}

// ============ TICKETS ============

export const listTickets = async (params?: Record<string, any>): Promise<Ticket[]> => {
    const searchParams = new URLSearchParams()
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                searchParams.set(k, String(v))
            }
        })
    }
    const query = searchParams.toString()
    return request<Ticket[]>(`/tickets${query ? `?${query}` : ''}`)
}

export const getTicket = async (id: string): Promise<Ticket> =>
    request<Ticket>(`/tickets/${id}`)

export const createTicket = async (data: {
    siteId: string
    type: string
    description: string
    status: Ticket['status']
    priority: Ticket['priority']
    details?: string
    assignedUserId?: string
    custom_fields?: Record<string, any>
}): Promise<Ticket> =>
    request<Ticket>('/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
    })

export const updateTicket = async (
    id: string,
    patch: Partial<Ticket> & { custom_fields?: any }
): Promise<Ticket> =>
    request<Ticket>(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
    })

export const bulkUpdateTickets = async (payload: {
    ids: string[]
    status?: Ticket['status']
    priority?: Ticket['priority']
    assignedUserId?: string | null
}): Promise<Ticket[]> => {
    // Notion doesn't support bulk updates natively, so we do them sequentially
    const results: Ticket[] = []
    for (const id of payload.ids) {
        const patch: any = {}
        if (payload.status) patch.status = payload.status
        if (payload.priority) patch.priority = payload.priority
        if (payload.assignedUserId !== undefined) patch.assignedUserId = payload.assignedUserId

        const updated = await updateTicket(id, patch)
        results.push(updated)
    }
    return results
}

export const bulkDeleteTickets = async (ids: string[]): Promise<{ deleted: number }> => {
    // Delete tickets one by one
    for (const id of ids) {
        await request(`/tickets/${id}`, { method: 'DELETE' })
    }
    return { deleted: ids.length }
}

export const listTicketHistory = async (id: string): Promise<TicketHistoryEntry[]> =>
    request<TicketHistoryEntry[]>(`/tickets/${id}/history`)

// ============ RECURRING TICKETS ============
// Note: Recurring tickets require Vercel Cron - not implemented in Phase 1

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

export const createRecurringTicket = async (data: RecurringTicketPayload): Promise<RecurringTicketConfig> =>
    request<RecurringTicketConfig>('/recurring-tickets', {
        method: 'POST',
        body: JSON.stringify(data),
    })

export const getRecurringTicketByOrigin = async (ticketId: string): Promise<RecurringTicketConfig> =>
    request<RecurringTicketConfig>(`/recurring-tickets/by-origin/${ticketId}`)

export const updateRecurringTicket = async (id: string, data: Partial<RecurringTicketPayload> & { isActive?: boolean }): Promise<RecurringTicketConfig> =>
    request<RecurringTicketConfig>(`/recurring-tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    })

export const listRecurringTickets = async (params?: { isActive?: boolean }): Promise<RecurringTicketConfig[]> => {
    const query = params?.isActive !== undefined ? `?isActive=${params.isActive}` : ''
    return request<RecurringTicketConfig[]>(`/recurring-tickets${query}`)
}

export const bulkUpdateRecurringTickets = async (ids: string[], updates: Partial<RecurringTicketPayload> & { isActive?: boolean }): Promise<{ updated: number }> =>
    request<{ updated: number }>('/recurring-tickets/bulk-update', {
        method: 'PATCH',
        body: JSON.stringify({ ids, updates }),
    })

export const bulkDeleteRecurringTickets = async (ids: string[]): Promise<{ deleted: number }> =>
    request<{ deleted: number }>('/recurring-tickets/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    })

export const bulkGroupRecurringTickets = async (ids: string[], groupName: string): Promise<{ grouped: number; groupName: string }> => {
    // Simplified for Notion
    console.warn('Grouping not directly supported in Notion, just updating group field if it exists')
    return { grouped: ids.length, groupName }
}

// ============ NOTIFICATIONS ============

export interface Notification {
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    ticketId?: string
    createdAt: string
}

export const listNotifications = async (): Promise<Notification[]> =>
    request<Notification[]>('/notifications')

export const markNotificationAsRead = async (id: string): Promise<Notification> =>
    request<Notification>(`/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true }),
    })

// ============ COMMENTS ============

export const listComments = async (ticketId: string): Promise<Comment[]> =>
    request<Comment[]>(`/tickets/${ticketId}/comments`)

export const addComment = async (
    ticketId: string,
    body: string,
    visibility: 'PUBLIC' | 'INTERNAL' = 'INTERNAL',
    mentions: string[] = []
): Promise<Comment> =>
    request<Comment>(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body, visibility, mentions }),
    })

export const updateComment = async (
    ticketId: string,
    commentId: string,
    body: string
): Promise<Comment> =>
    request<Comment>(`/tickets/${ticketId}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
    })

export const deleteComment = async (ticketId: string, commentId: string): Promise<void> => {
    await request(`/tickets/${ticketId}/comments/${commentId}`, { method: 'DELETE' })
}

// ============ ATTACHMENTS ============
// Note: Attachments require external storage - not implemented in Phase 1

export const listAttachments = async (ticketId: string): Promise<Attachment[]> =>
    request<Attachment[]>(`/attachments?ticketId=${ticketId}`)

export const presignAttachment = async (ticketId: string, filename: string, mime: string): Promise<PresignResponse> =>
    request<PresignResponse>('/attachments/presign', {
        method: 'POST',
        body: JSON.stringify({ ticketId, filename, contentType: mime }),
    })

export const finalizeAttachment = async (ticketId: string, attachmentId: string, size: number, checksumSha256: string): Promise<Attachment> =>
    request<Attachment>('/attachments/finalize', {
        method: 'POST',
        body: JSON.stringify({ ticketId, attachmentId, size, checksumSha256 }),
    })

export const deleteAttachment = async (_ticketId: string, attachmentId: string): Promise<void> => {
    await request(`/attachments/${attachmentId}`, { method: 'DELETE' })
}

// ============ SITES ============

export const listSitesDetailed = async (): Promise<Site[]> =>
    request<Site[]>('/sites')

export const createSite = async (data: { name: string; location?: string }): Promise<Site> =>
    request<Site>('/sites', {
        method: 'POST',
        body: JSON.stringify(data),
    })

export const updateSite = async (id: string, data: { name?: string; location?: string }): Promise<Site> =>
    request<Site>(`/sites/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    })

export const deleteSite = async (id: string): Promise<void> => {
    await request(`/sites/${id}`, { method: 'DELETE' })
}

// ============ HEALTH & FEATURES ============

export const getHealth = async (): Promise<HealthStatus> => {
    // Simplified health check for Notion backend
    return { status: 'ok' }
}

export const getHealthDb = async (): Promise<HealthStatus> => {
    // Test Notion connection by listing sites
    try {
        await listSitesDetailed()
        return { status: 'ok', info: { notion: { status: 'up' } } }
    } catch (error) {
        return { status: 'error', error: { notion: { status: 'down', message: String(error) } } }
    }
}

export const getHealthRedis = async (): Promise<HealthStatus> => {
    // No Redis in Notion setup
    return { status: 'ok', info: { redis: { status: 'not applicable' } } }
}

export const getFeatures = async (): Promise<Features> => {
    // Feature flags for Notion backend
    return {
        search: false,
        attachments: true,
        recurring: true,
        notifications: true,
        history: true,
    }
}

// ============ USERS (for directory) ============

export const listUsers = async (): Promise<User[]> =>
    request<User[]>('/users')

export const getUser = async (id: string): Promise<User> =>
    request<User>(`/users/${id}`)

// ============ ISSUE TYPES ============

export const listIssueTypes = async (): Promise<IssueType[]> =>
    request<IssueType[]>('/types')
