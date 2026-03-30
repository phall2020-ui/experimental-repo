/**
 * Vercel Cron: Recurring Tickets
 * 
 * This function runs daily to generate new tickets from recurring configurations.
 */

import { Client } from '@notionhq/client'

export const config = {
    runtime: 'edge',
}

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
})

const DB = {
    tickets: process.env.NOTION_TICKETS_DB!,
    recurring: process.env.NOTION_RECURRING_DB!,
}

export default async function handler(request: Request) {
    // Verify auth (Vercel sets CRON_SECRET)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const results = await processRecurringTickets()
        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        console.error('Cron error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}

async function processRecurringTickets() {
    const now = new Date().toISOString()

    // 1. Find all active recurring configs that are due
    const response = await notion.databases.query({
        database_id: DB.recurring,
        filter: {
            and: [
                { property: 'Is Active', checkbox: { equals: true } },
                { property: 'Next Scheduled At', date: { on_or_before: now } }
            ]
        }
    })

    const configs = response.results
    const processed = []

    for (const config of configs as any[]) {
        try {
            const props = config.properties
            const originTicketId = props['Origin Ticket']?.relation?.[0]?.id

            if (!originTicketId) {
                console.warn(`No origin ticket for recurring config ${config.id}`)
                continue
            }

            // 2. Fetch origin ticket or template data
            const originTicket = await notion.pages.retrieve({ page_id: originTicketId }) as any
            const originProps = originTicket.properties

            // 3. Create new ticket
            const ticketId = `TKT-AUTO-${Date.now().toString(36).toUpperCase()}`
            const newTicketProperties: any = {
                ID: { title: [{ text: { content: ticketId } }] },
                Type: originProps.Type,
                Description: { rich_text: [{ text: { content: `[Recurring] ${extractRichText(originProps.Description)}` } }] },
                Status: { select: { name: 'OPEN' } },
                Priority: originProps.Priority,
                Site: originProps.Site,
                Details: originProps.Details,
                'Assigned User': originProps['Assigned User'],
            }

            const newTicket = await notion.pages.create({
                parent: { database_id: DB.tickets },
                properties: newTicketProperties,
            })

            // 4. Calculate next run date
            const frequency = props.Frequency?.select?.name
            const intervalValue = props['Interval Value']?.number || 1
            const currentScheduled = new Date(props['Next Scheduled At']?.date?.start)
            const nextDate = calculateNextDate(currentScheduled, frequency, intervalValue)

            // 5. Update recurring config
            await notion.pages.update({
                page_id: config.id,
                properties: {
                    'Next Scheduled At': { date: { start: nextDate.toISOString() } },
                    'Last Generated At': { date: { start: now } },
                }
            })

            processed.push({ configId: config.id, newTicketId: newTicket.id })
        } catch (err: any) {
            console.error(`Error processing config ${config.id}:`, err)
            processed.push({ configId: config.id, error: err.message })
        }
    }

    return { processed, count: processed.length }
}

function calculateNextDate(current: Date, frequency: string, interval: number): Date {
    const next = new Date(current)
    switch (frequency) {
        case 'DAILY':
            next.setDate(next.getDate() + interval)
            break
        case 'WEEKLY':
            next.setDate(next.getDate() + (interval * 7))
            break
        case 'MONTHLY':
            next.setMonth(next.getMonth() + interval)
            break
        case 'QUARTERLY':
            next.setMonth(next.getMonth() + (interval * 3))
            break
        case 'YEARLY':
            next.setFullYear(next.getFullYear() + interval)
            break
        default:
            next.setDate(next.getDate() + 1)
    }
    return next
}

function extractRichText(prop: any): string {
    if (!prop || !prop.rich_text) return ''
    return prop.rich_text.map((t: any) => t.plain_text || '').join('')
}
