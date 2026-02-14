/**
 * Vercel Edge Function: Proxy for Notion API
 * 
 * This function proxies requests to the Notion API to avoid CORS issues.
 * All Notion API calls from the browser go through this endpoint.
 */

import { Client } from '@notionhq/client'

export const config = {
    runtime: 'edge',
}

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
})

// Database IDs from environment
const DB = {
    sites: process.env.NOTION_SITES_DB!,
    users: process.env.NOTION_USERS_DB!,
    types: process.env.NOTION_TYPES_DB!,
    tickets: process.env.NOTION_TICKETS_DB!,
    comments: process.env.NOTION_COMMENTS_DB!,
    notifications: process.env.NOTION_NOTIFICATIONS_DB!,
    history: process.env.NOTION_HISTORY_DB!,
    attachments: process.env.NOTION_ATTACHMENTS_DB!,
    recurring: process.env.NOTION_RECURRING_DB!,
    templates: process.env.NOTION_TEMPLATES_DB!,
}

export default async function handler(request: Request) {
    const url = new URL(request.url)
    const API = '/api/notion'
    const path = url.pathname.replace(API + '/', '')
    const method = request.method

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            },
        })
    }

    try {
        // Route the request to the appropriate handler
        const result = await routeRequest(path, method, request)

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        })
    } catch (error: any) {
        console.error('Notion API error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            {
                status: error.status || 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
}

async function routeRequest(path: string, method: string, request: Request) {
    const segments = path.split('/').filter(Boolean)

    // Parse request body for POST/PATCH
    let body: any = {}
    if (method === 'POST' || method === 'PATCH') {
        try {
            body = await request.json()
        } catch {
            body = {}
        }
    }

    // Sites endpoints
    if (segments[0] === 'sites') {
        if (method === 'GET' && segments.length === 1) {
            return await listSites()
        }
        if (method === 'GET' && segments.length === 2) {
            return await getSite(segments[1])
        }
        if (method === 'POST' && segments.length === 1) {
            return await createSite(body)
        }
        if (method === 'PATCH' && segments.length === 2) {
            return await updateSite(segments[1], body)
        }
        if (method === 'DELETE' && segments.length === 2) {
            return await deleteSite(segments[1])
        }
    }

    // Users endpoints  
    if (segments[0] === 'users') {
        if (method === 'GET' && segments.length === 1) {
            return await listUsers()
        }
        if (method === 'GET' && segments.length === 2) {
            return await getUser(segments[1])
        }
        if (method === 'POST' && segments.length === 1) {
            return await createUser(body)
        }
        if (method === 'PATCH' && segments.length === 2) {
            return await updateUser(segments[1], body)
        }
        if (method === 'DELETE' && segments.length === 2) {
            return await deleteUser(segments[1])
        }
    }

    // Issue types endpoints
    if (segments[0] === 'types') {
        if (method === 'GET' && segments.length === 1) {
            return await listIssueTypes()
        }
        if (method === 'POST' && segments.length === 1) {
            return await createIssueType(body)
        }
        if (method === 'PATCH' && segments.length === 2) {
            return await updateIssueType(segments[1], body)
        }
        if (method === 'DELETE' && segments.length === 2) {
            return await deleteIssueType(segments[1])
        }
    }

    // Auth endpoints (Phase 1)
    if (segments[0] === 'auth') {
        if (method === 'POST') {
            if (segments[1] === 'login') return await loginUser(body)
            if (segments[1] === 'register') return await registerUser(body)
        }
    }

    // Templates endpoints
    if (segments[0] === 'templates') {
        if (method === 'GET') {
            if (segments.length === 1) return await listTemplates()
            if (segments.length === 2) return await getTemplate(segments[1])
        }
        if (method === 'POST' && segments.length === 1) return await createTemplate(body)
        if (method === 'DELETE' && segments.length === 2) return await deleteTemplate(segments[1])
    }

    // Attachments endpoints (Phase 3)
    if (segments[0] === 'attachments') {
        if (method === 'GET' && segments.length === 1) {
            const url = new URL(request.url)
            const params = Object.fromEntries(url.searchParams)
            return await listTickets(params)
        }
        if (method === 'GET' && segments.length === 2) {
            return await getTicket(segments[1])
        }
        if (method === 'POST' && segments.length === 1) {
            return await createTicket(body)
        }
        if (method === 'PATCH' && segments.length === 2) {
            return await updateTicket(segments[1], body)
        }
        if (method === 'DELETE' && segments.length === 2) {
            return await deleteTicket(segments[1])
        }
        // Comments sub-resource
        if (segments[2] === 'comments') {
            if (method === 'GET' && segments.length === 3) {
                return await listComments(segments[1])
            }
            if (method === 'POST' && segments.length === 3) {
                return await createComment(segments[1], body)
            }
            if (method === 'PATCH' && segments.length === 4) {
                return await updateComment(segments[3], body)
            }
            if (method === 'DELETE' && segments.length === 4) {
                return await deleteComment(segments[3])
            }
        }
    }

    // Recurring Tickets endpoints
    if (segments[0] === 'recurring-tickets') {
        if (method === 'GET' && segments.length === 1) {
            const url = new URL(request.url)
            const isActive = url.searchParams.get('isActive')
            return await listRecurringConfigs(isActive === 'true' ? true : isActive === 'false' ? false : undefined)
        }
        if (method === 'GET' && segments[1] === 'by-origin' && segments.length === 3) {
            return await getRecurringConfigByOrigin(segments[2])
        }
        if (method === 'POST' && segments.length === 1) {
            return await createRecurringConfig(body)
        }
        if (method === 'PATCH' && segments.length === 2) {
            return await updateRecurringConfig(segments[1], body)
        }
        if (method === 'DELETE' && segments.length === 2) {
            return await deleteRecurringConfig(segments[1])
        }
        // Bulk operations
        if (method === 'PATCH' && segments[1] === 'bulk-update') {
            return await bulkUpdateRecurringConfigs(body.ids, body.updates)
        }
        if (method === 'POST' && segments[1] === 'bulk-delete') {
            return await bulkDeleteRecurringConfigs(body.ids)
        }
    }

    // Notifications endpoints
    if (segments[0] === 'notifications') {
        if (method === 'GET') {
            if (segments.length === 1) return await listNotifications()
            if (segments[1] === 'unread-count') return { count: 0 } // Mock for now
        }
        if (segments.length === 2) {
            if (method === 'PATCH') return await updateNotification(segments[1], body)
            if (method === 'POST' && segments[2] === 'read') {
                return await updateNotification(segments[1], { isRead: true })
            }
        }
        if (method === 'POST' && segments[1] === 'daily-refresh') {
            return { success: true } // Mock
        }
        if (method === 'POST' && segments[1] === 'mark-all-read') {
            return { success: true } // Mock
        }
    }

    throw { status: 404, message: `Route not found: ${method} ${path}` }
}

// ============ SITES ============

async function listSites() {
    const response = await notion.databases.query({
        database_id: DB.sites,
    })

    return response.results.map(pageToSite)
}

async function getSite(id: string) {
    const page = await notion.pages.retrieve({ page_id: id })
    return pageToSite(page)
}

async function createSite(data: { name: string; location?: string }) {
    const page = await notion.pages.create({
        parent: { database_id: DB.sites },
        properties: {
            Name: { title: [{ text: { content: data.name } }] },
            ...(data.location && { Location: { rich_text: [{ text: { content: data.location } }] } }),
        },
    })
    return pageToSite(page)
}

async function updateSite(id: string, data: { name?: string; location?: string }) {
    const properties: any = {}
    if (data.name) properties.Name = { title: [{ text: { content: data.name } }] }
    if (data.location !== undefined) {
        properties.Location = { rich_text: [{ text: { content: data.location || '' } }] }
    }

    const page = await notion.pages.update({ page_id: id, properties })
    return pageToSite(page)
}

async function deleteSite(id: string) {
    await notion.pages.update({ page_id: id, archived: true })
    return { success: true }
}

function pageToSite(page: any) {
    const props = page.properties
    return {
        id: page.id,
        name: extractTitle(props.Name),
        location: extractRichText(props.Location),
    }
}

// ============ USERS ============

async function listUsers() {
    const response = await notion.databases.query({
        database_id: DB.users,
    })

    return response.results.map(pageToUser)
}

async function getUser(id: string) {
    const page = await notion.pages.retrieve({ page_id: id })
    return pageToUser(page)
}

function pageToUser(page: any) {
    const props = page.properties
    return {
        id: page.id,
        name: extractTitle(props.Name),
        email: props.Email?.email || '',
        role: extractSelect(props.Role) || 'USER',
        plainPassword: extractRichText(props['Plain Password']),
        lastLoginAt: props['Last Login']?.date?.start || null,
    }
}

async function createUser(data: { email: string; name: string; role?: string }) {
    const page = await notion.pages.create({
        parent: { database_id: DB.users },
        properties: {
            Name: { title: [{ text: { content: data.name } }] },
            Email: { email: data.email },
            Role: { select: { name: data.role || 'USER' } },
        },
    })
    return pageToUser(page)
}

async function updateUser(id: string, data: { name?: string; email?: string; role?: string }) {
    const properties: any = {}
    if (data.name) properties.Name = { title: [{ text: { content: data.name } }] }
    if (data.email) properties.Email = { email: data.email }
    if (data.role) properties.Role = { select: { name: data.role } }

    const page = await notion.pages.update({ page_id: id, properties })
    return pageToUser(page)
}

async function deleteUser(id: string) {
    await notion.pages.update({ page_id: id, archived: true })
    return { success: true }
}

async function registerUser(data: { email: string; name: string; role: string; password?: string; tenantId?: string }) {
    if (!DB.users) throw new Error('Users database not configured')

    // Check if user exists
    const existing = await notion.databases.query({
        database_id: DB.users,
        filter: { property: 'Email', title: { equals: data.email } } // Filter by Email (title type)
    })
    if (existing.results.length > 0) throw { status: 400, message: 'User already exists' }

    const page = await notion.pages.create({
        parent: { database_id: DB.users },
        properties: {
            Name: { title: [{ text: { content: data.name } }] },
            Email: { email: data.email },
            Role: { select: { name: data.role || 'USER' } },
            'Plain Password': { rich_text: [{ text: { content: data.password || '' } }] },
            'Is Active': { checkbox: true },
        }
    })

    const user = pageToUser(page)
    return { user, token: `mock-token-${user.id}` }
}

async function loginUser(data: { email: string; password?: string }) {
    if (!DB.users) throw new Error('Users database not configured')

    const response = await notion.databases.query({
        database_id: DB.users,
        filter: {
            and: [
                { property: 'Email', email: { equals: data.email } },
                { property: 'Is Active', checkbox: { equals: true } }
            ]
        }
    })

    if (response.results.length === 0) throw { status: 401, message: 'Invalid credentials' }

    const userPage = response.results[0] as any
    const user = pageToUser(userPage)

    // Mock token for now - in production use JWT
    return {
        user,
        token: `mock-token-${user.id}-${user.role}`
    }
}

// ============ ISSUE TYPES ============

async function listIssueTypes() {
    const response = await notion.databases.query({
        database_id: DB.types,
        filter: {
            property: 'Active',
            checkbox: { equals: true },
        },
    })

    return response.results.map(pageToIssueType)
}

function pageToIssueType(page: any) {
    const props = page.properties
    return {
        id: page.id,
        key: extractTitle(props.Key),
        label: extractRichText(props.Label),
        active: props.Active?.checkbox ?? true,
    }
}

async function createIssueType(data: { key: string; label: string }) {
    const page = await notion.pages.create({
        parent: { database_id: DB.types },
        properties: {
            Key: { title: [{ text: { content: data.key } }] },
            Label: { rich_text: [{ text: { content: data.label } }] },
            Active: { checkbox: true },
        },
    })
    return pageToIssueType(page)
}

async function updateIssueType(id: string, data: { key?: string; label?: string; active?: boolean }) {
    const properties: any = {}
    if (data.key) properties.Key = { title: [{ text: { content: data.key } }] }
    if (data.label) properties.Label = { rich_text: [{ text: { content: data.label } }] }
    if (data.active !== undefined) properties.Active = { checkbox: data.active }

    const page = await notion.pages.update({ page_id: id, properties })
    return pageToIssueType(page)
}

async function deleteIssueType(id: string) {
    // Soft delete by setting Active to false
    await notion.pages.update({
        page_id: id,
        properties: { Active: { checkbox: false } }
    })
    return { success: true }
}

// ============ TICKETS ============

async function listTickets(params: Record<string, string>) {
    const filters: any[] = []

    // Build filters from query params
    if (params.status) {
        filters.push({ property: 'Status', select: { equals: params.status } })
    }
    if (params.priority) {
        filters.push({ property: 'Priority', select: { equals: params.priority } })
    }
    if (params.siteId) {
        filters.push({ property: 'Site', relation: { contains: params.siteId } })
    }
    if (params.assignedUserId) {
        filters.push({ property: 'Assigned User', relation: { contains: params.assignedUserId } })
    }
    if (params.type) {
        filters.push({ property: 'Type', rich_text: { equals: params.type } })
    }
    if (params.search) {
        // Fallback for full-text search: search in Description
        filters.push({ property: 'Description', rich_text: { contains: params.search } })
    }

    const response = await notion.databases.query({
        database_id: DB.tickets,
        filter: filters.length > 0
            ? { and: filters }
            : undefined,
        sorts: [{ property: 'Created At', direction: 'descending' }],
    })

    return response.results.map(pageToTicket)
}

async function getTicket(id: string) {
    const page = await notion.pages.retrieve({ page_id: id })
    return pageToTicket(page)
}

async function createTicket(data: {
    siteId: string
    type: string
    description: string
    status: string
    priority: string
    details?: string
    assignedUserId?: string
    custom_fields?: Record<string, any>
}) {
    // Generate ticket ID (simplified - in production you'd want a sequence)
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`

    const properties: any = {
        ID: { title: [{ text: { content: ticketId } }] },
        Type: { rich_text: [{ text: { content: data.type || (data as any).typeKey } }] },
        Description: { rich_text: [{ text: { content: data.description } }] },
        Status: { select: { name: data.status } },
        Priority: { select: { name: data.priority } },
        Site: { relation: [{ id: data.siteId }] },
    }

    if (data.details) {
        properties.Details = { rich_text: [{ text: { content: data.details } }] }
    }
    if (data.assignedUserId) {
        properties['Assigned User'] = { relation: [{ id: data.assignedUserId }] }
    }
    if (data.custom_fields) {
        properties['Custom Fields'] = { rich_text: [{ text: { content: JSON.stringify(data.custom_fields) } }] }
    }

    const page = await notion.pages.create({
        parent: { database_id: DB.tickets },
        properties,
    })

    const newTicket = pageToTicket(page)

    // Log history (Phase 2)
    if (DB.history) {
        await logTicketHistory(newTicket.id, { _action: 'CREATE', ...data })
    }

    return newTicket
}

async function updateTicket(id: string, data: Partial<{
    status: string
    priority: string
    description: string
    details: string
    assignedUserId: string | null
    custom_fields: Record<string, any>
    dueAt: string | null
    siteId: string
    type: string
    typeKey: string
}>) {
    const properties: any = {}

    if (data.status) properties.Status = { select: { name: data.status } }
    if (data.priority) properties.Priority = { select: { name: data.priority } }
    if (data.description) properties.Description = { rich_text: [{ text: { content: data.description } }] }
    if (data.siteId) properties.Site = { relation: [{ id: data.siteId }] }
    if (data.type || data.typeKey) {
        properties.Type = { rich_text: [{ text: { content: data.type || data.typeKey } }] }
    }
    if (data.details !== undefined) {
        properties.Details = { rich_text: [{ text: { content: data.details || '' } }] }
    }
    if (data.assignedUserId !== undefined) {
        properties['Assigned User'] = data.assignedUserId
            ? { relation: [{ id: data.assignedUserId }] }
            : { relation: [] }
    }
    if (data.custom_fields) {
        properties['Custom Fields'] = { rich_text: [{ text: { content: JSON.stringify(data.custom_fields) } }] }
    }
    if (data.dueAt !== undefined) {
        properties['Due Date'] = data.dueAt ? { date: { start: data.dueAt } } : { date: null }
    }

    const page = await notion.pages.update({ page_id: id, properties })
    const updatedTicket = pageToTicket(page)

    // Log history (Phase 2)
    if (DB.history) {
        await logTicketHistory(id, data)
    }

    return updatedTicket
}

async function logTicketHistory(ticketId: string, changes: any) {
    // Only log if there are actual changes being tracked
    const trackableFields = ['status', 'priority', 'assignedUserId', 'description', 'details', 'dueAt']
    const filteredChanges: any = {}

    Object.keys(changes).forEach(key => {
        if (trackableFields.includes(key)) {
            filteredChanges[key] = { to: changes[key] }
        }
    })

    if (Object.keys(filteredChanges).length === 0) return

    await notion.pages.create({
        parent: { database_id: DB.history },
        properties: {
            ID: { title: [{ text: { content: crypto.randomUUID() } }] },
            Ticket: { relation: [{ id: ticketId }] },
            Changes: { rich_text: [{ text: { content: JSON.stringify(filteredChanges) } }] },
            At: { date: { start: new Date().toISOString() } }
        },
    })
}

async function listTicketHistory(ticketId: string) {
    if (!DB.history) return []

    const response = await notion.databases.query({
        database_id: DB.history,
        filter: {
            property: 'Ticket',
            relation: { contains: ticketId },
        },
        sorts: [{ property: 'At', direction: 'descending' }],
    })

    return response.results.map((page: any) => {
        const props = page.properties
        return {
            id: page.id,
            ticketId: extractRelation(props.Ticket)[0],
            changes: JSON.parse(extractRichText(props.Changes) || '{}'),
            at: extractDate(props.At) || page.created_time,
        }
    })
}

async function deleteTicket(id: string) {
    await notion.pages.update({ page_id: id, archived: true })
    return { success: true }
}

function pageToTicket(page: any) {
    const props = page.properties
    const customFieldsRaw = extractRichText(props['Custom Fields'])

    return {
        id: page.id,
        ticketId: extractTitle(props.ID),
        siteId: extractRelation(props.Site)[0] || '',
        typeKey: extractRichText(props.Type),
        description: extractRichText(props.Description),
        status: extractSelect(props.Status) || 'AWAITING_RESPONSE',
        priority: extractSelect(props.Priority) || 'P3',
        details: extractRichText(props.Details),
        assignedUserId: extractRelation(props['Assigned User'])[0] || null,
        dueAt: extractDate(props['Due Date']),
        customFields: customFieldsRaw ? JSON.parse(customFieldsRaw) : {},
        createdAt: props['Created At']?.created_time || new Date().toISOString(),
        updatedAt: props['Updated At']?.last_edited_time || new Date().toISOString(),
    }
}

// ============ COMMENTS ============

async function listComments(ticketId: string) {
    const response = await notion.databases.query({
        database_id: DB.comments,
        filter: {
            property: 'Ticket',
            relation: { contains: ticketId },
        },
        sorts: [{ property: 'Created At', direction: 'ascending' }],
    })

    return response.results.map(pageToComment)
}

async function createComment(ticketId: string, data: {
    body: string
    visibility?: 'PUBLIC' | 'INTERNAL'
    mentions?: string[]
}) {
    const properties: any = {
        Body: { title: [{ text: { content: data.body } }] },
        Ticket: { relation: [{ id: ticketId }] },
    }
    if (data.visibility) {
        properties.Visibility = { select: { name: data.visibility } }
    }
    if (data.mentions && data.mentions.length > 0) {
        properties.Mentions = { relation: data.mentions.map((id: string) => ({ id })) }
    }

    const page = await notion.pages.create({
        parent: { database_id: DB.comments },
        properties,
    })

    return pageToComment(page)
}

// ============ TEMPLATES ============

async function listTemplates() {
    if (!DB.templates) return []
    const response = await notion.databases.query({
        database_id: DB.templates,
        sorts: [{ property: 'Name', direction: 'ascending' }]
    })
    return response.results.map(pageToTemplate)
}

async function getTemplate(id: string) {
    const page = await notion.pages.retrieve({ page_id: id })
    return pageToTemplate(page)
}

async function createTemplate(data: any) {
    if (!DB.templates) throw new Error('Templates database not configured')
    const properties: any = {
        Name: { title: [{ text: { content: data.name } }] },
        'Issue Type': { rich_text: [{ text: { content: data.typeKey } }] },
        Description: { rich_text: [{ text: { content: data.description } }] },
        Priority: { select: { name: data.priority } },
        Status: { select: { name: data.status } },
        'Is Recurring': { checkbox: data.isRecurring || false },
    }
    if (data.details) properties.Details = { rich_text: [{ text: { content: data.details } }] }
    if (data.assignedUserId) properties['Assigned User'] = { relation: [{ id: data.assignedUserId }] }
    if (data.customFields) properties['Custom Fields'] = { rich_text: [{ text: { content: JSON.stringify(data.customFields) } }] }
    if (data.frequency) properties.Frequency = { select: { name: data.frequency } }
    if (data.intervalValue) properties['Interval Value'] = { number: data.intervalValue }
    if (data.leadTimeDays) properties['Lead Time Days'] = { number: data.leadTimeDays }

    const page = await notion.pages.create({
        parent: { database_id: DB.templates },
        properties,
    })
    return pageToTemplate(page)
}

async function deleteTemplate(id: string) {
    await notion.pages.update({ page_id: id, archived: true })
    return { success: true }
}

function pageToTemplate(page: any) {
    const props = page.properties
    return {
        id: page.id,
        name: extractTitle(props.Name),
        typeKey: extractRichText(props['Issue Type']),
        description: extractRichText(props.Description),
        details: extractRichText(props.Details),
        priority: extractSelect(props.Priority),
        status: extractSelect(props.Status),
        assignedUserId: extractRelation(props['Assigned User'])[0],
        customFields: props['Custom Fields'] ? JSON.parse(extractRichText(props['Custom Fields'])) : {},
        isRecurring: extractCheckbox(props['Is Recurring']),
        frequency: extractSelect(props.Frequency),
        intervalValue: props['Interval Value']?.number,
        leadTimeDays: props['Lead Time Days']?.number,
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
    }
}

async function updateComment(commentId: string, data: { body: string }) {
    const page = await notion.pages.update({
        page_id: commentId,
        properties: {
            Body: { rich_text: [{ text: { content: data.body } }] },
        },
    })

    return pageToComment(page)
}

async function deleteComment(commentId: string) {
    await notion.pages.update({ page_id: commentId, archived: true })
    return { success: true }
}

function pageToComment(page: any) {
    const props = page.properties
    return {
        id: page.id,
        ticketId: extractRelation(props.Ticket)[0] || '',
        body: extractRichText(props.Body),
        visibility: extractSelect(props.Visibility) || 'INTERNAL',
        createdAt: props['Created At']?.created_time || new Date().toISOString(),
    }
}

// ============ RECURRING CONFIGS ============

async function listRecurringConfigs(isActive?: boolean) {
    const filters: any[] = []
    if (isActive !== undefined) {
        filters.push({ property: 'Is Active', checkbox: { equals: isActive } })
    }

    const response = await notion.databases.query({
        database_id: (DB as any).recurring || DB.tickets,
        filter: filters.length > 0 ? { and: filters } : undefined,
    })

    return response.results.map(pageToRecurringConfig)
}

async function getRecurringConfigByOrigin(originTicketId: string) {
    const response = await notion.databases.query({
        database_id: (DB as any).recurring || DB.tickets,
        filter: { property: 'Origin Ticket', relation: { contains: originTicketId } }
    })
    if (response.results.length === 0) return null
    return pageToRecurringConfig(response.results[0])
}

async function createRecurringConfig(data: any) {
    const properties: any = {
        Title: { title: [{ text: { content: data.description } }] },
        'Origin Ticket': { relation: [{ id: data.originTicketId }] },
        Site: { relation: [{ id: data.siteId }] },
        Frequency: { select: { name: data.frequency } },
        'Interval Value': { number: data.intervalValue },
        'Start Date': { date: { start: data.startDate } },
        'Lead Time Days': { number: data.leadTimeDays },
        'Is Active': { checkbox: true },
        'Next Scheduled At': { date: { start: data.startDate } }, // Initial
    }

    if (data.endDate) properties['End Date'] = { date: { start: data.endDate } }

    const page = await notion.pages.create({
        parent: { database_id: (DB as any).recurring || DB.tickets },
        properties,
    })
    return pageToRecurringConfig(page)
}

async function updateRecurringConfig(id: string, data: any) {
    const properties: any = {}
    if (data.frequency) properties.Frequency = { select: { name: data.frequency } }
    if (data.intervalValue !== undefined) properties['Interval Value'] = { number: data.intervalValue }
    if (data.isActive !== undefined) properties['Is Active'] = { checkbox: data.isActive }
    if (data.nextScheduledAt) properties['Next Scheduled At'] = { date: { start: data.nextScheduledAt } }

    const page = await notion.pages.update({ page_id: id, properties })
    return pageToRecurringConfig(page)
}

async function deleteRecurringConfig(id: string) {
    await notion.pages.update({ page_id: id, archived: true })
    return { success: true }
}

async function bulkUpdateRecurringConfigs(ids: string[], updates: any) {
    for (const id of ids) {
        await updateRecurringConfig(id, updates)
    }
    return { updated: ids.length }
}

async function bulkDeleteRecurringConfigs(ids: string[]) {
    for (const id of ids) {
        await deleteRecurringConfig(id)
    }
    return { deleted: ids.length }
}

function pageToRecurringConfig(page: any) {
    const props = page.properties
    return {
        id: page.id,
        originTicketId: extractRelation(props['Origin Ticket'])[0],
        siteId: extractRelation(props.Site)[0],
        frequency: extractSelect(props.Frequency),
        intervalValue: props['Interval Value']?.number,
        startDate: extractDate(props['Start Date']),
        endDate: extractDate(props['End Date']),
        leadTimeDays: props['Lead Time Days']?.number,
        isActive: extractCheckbox(props['Is Active']),
        nextScheduledAt: extractDate(props['Next Scheduled At']),
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
    }
}

// ============ NOTIFICATIONS ============

async function listNotifications() {
    const response = await notion.databases.query({
        database_id: DB.notifications,
        sorts: [{ property: 'Created At', direction: 'descending' }]
    })
    return response.results.map(pageToNotification)
}

async function updateNotification(id: string, data: { isRead: boolean }) {
    const properties: any = {}
    if (data.isRead !== undefined) properties['Is Read'] = { checkbox: data.isRead }
    const page = await notion.pages.update({ page_id: id, properties })
    return pageToNotification(page)
}

function pageToNotification(page: any) {
    const props = page.properties
    return {
        id: page.id,
        title: extractTitle(props.Title),
        message: extractRichText(props.Message),
        type: extractSelect(props.Type),
        isRead: extractCheckbox(props['Is Read']),
        ticketId: extractRelation(props.Ticket)[0],
        createdAt: page.created_time,
    }
}

// ============ ATTACHMENTS ============

async function listAttachments(ticketId: string) {
    if (!DB.attachments) return []
    const response = await notion.databases.query({
        database_id: DB.attachments,
        filter: {
            property: 'Ticket',
            relation: { contains: ticketId },
        },
    })
    return response.results.map(pageToAttachment)
}

async function presignAttachment(ticketId: string, filename: string, contentType: string) {
    // For MVP, since we don't have S3 credentials yet, we return a mock presigned URL
    // and instructions. In production, use @aws-sdk/s3-request-presigner here.
    const attachmentId = crypto.randomUUID()
    const storageKey = `tickets/${ticketId}/${attachmentId}-${filename}`

    // This is where you would call getSignedUrl from S3 SDK
    return {
        url: `https://placeholder-storage.com/${storageKey}`,
        attachmentId,
        fields: {
            'Content-Type': contentType,
            'x-amz-meta-ticket-id': ticketId,
        },
    }
}

async function finalizeAttachment(data: { ticketId: string; attachmentId: string; filename: string; size: number; contentType: string; storageUrl: string }) {
    if (!DB.attachments) throw new Error('Attachments database not configured')

    const page = await notion.pages.create({
        parent: { database_id: DB.attachments },
        properties: {
            Filename: { title: [{ text: { content: data.filename } }] },
            Ticket: { relation: [{ id: data.ticketId }] },
            'Storage URL': { url: data.storageUrl },
            Size: { number: data.size },
            'Content Type': { rich_text: [{ text: { content: data.contentType } }] },
        },
    })
    return pageToAttachment(page)
}

async function deleteAttachment(id: string) {
    await notion.pages.update({ page_id: id, archived: true })
    return { success: true }
}

function pageToAttachment(page: any) {
    const props = page.properties
    return {
        id: page.id,
        ticketId: extractRelation(props.Ticket)[0],
        filename: extractTitle(props.Filename),
        size: props.Size?.number || 0,
        contentType: extractRichText(props['Content Type']),
        downloadUrl: props['Storage URL']?.url || '',
        createdAt: page.created_time,
    }
}

// ============ HELPER FUNCTIONS ============

function extractTitle(prop: any): string {
    if (!prop || !prop.title) return ''
    return prop.title.map((t: any) => t.plain_text || '').join('')
}

function extractRichText(prop: any): string {
    if (!prop || !prop.rich_text) return ''
    return prop.rich_text.map((t: any) => t.plain_text || '').join('')
}

function extractSelect(prop: any): string | null {
    if (!prop || !prop.select) return null
    return prop.select.name || null
}

function extractDate(prop: any): string | null {
    if (!prop || !prop.date) return null
    return prop.date.start || null
}

function extractCheckbox(prop: any): boolean {
    if (!prop || prop.type !== 'checkbox') return false
    return prop.checkbox || false
}

function extractRelation(prop: any): string[] {
    if (!prop || !prop.relation) return []
    return prop.relation.map((r: any) => r.id)
}
