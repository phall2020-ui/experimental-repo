/**
 * Notion Client Configuration
 * 
 * This module provides a configured Notion client instance for the application.
 * IMPORTANT: Due to Notion API CORS restrictions, all Notion API calls must go through
 * a server-side proxy (Vercel Edge Functions) in production.
 */

import { Client } from '@notionhq/client'

// Environment variables for Notion configuration
export const NOTION_CONFIG = {
  token: import.meta.env.VITE_NOTION_TOKEN as string,
  databases: {
    sites: import.meta.env.VITE_NOTION_SITES_DB as string,
    users: import.meta.env.VITE_NOTION_USERS_DB as string,
    types: import.meta.env.VITE_NOTION_TYPES_DB as string,
    tickets: import.meta.env.VITE_NOTION_TICKETS_DB as string,
    comments: import.meta.env.VITE_NOTION_COMMENTS_DB as string,
    notifications: import.meta.env.VITE_NOTION_NOTIFICATIONS_DB as string,
  }
}

// Validate configuration
export function validateNotionConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  
  if (!NOTION_CONFIG.token) missing.push('VITE_NOTION_TOKEN')
  if (!NOTION_CONFIG.databases.sites) missing.push('VITE_NOTION_SITES_DB')
  if (!NOTION_CONFIG.databases.users) missing.push('VITE_NOTION_USERS_DB')
  if (!NOTION_CONFIG.databases.types) missing.push('VITE_NOTION_TYPES_DB')
  if (!NOTION_CONFIG.databases.tickets) missing.push('VITE_NOTION_TICKETS_DB')
  if (!NOTION_CONFIG.databases.comments) missing.push('VITE_NOTION_COMMENTS_DB')
  
  return { valid: missing.length === 0, missing }
}

/**
 * Create a Notion client instance
 * Note: This is mainly used for server-side functions (Vercel Edge/API routes)
 * Browser-side requests need to go through the proxy due to CORS
 */
export function createNotionClient(): Client {
  if (!NOTION_CONFIG.token) {
    throw new Error('Notion token not configured. Set VITE_NOTION_TOKEN environment variable.')
  }
  
  return new Client({
    auth: NOTION_CONFIG.token,
  })
}

// Property type helpers for Notion pages
export type NotionPropertyValue = 
  | { type: 'title'; value: string }
  | { type: 'rich_text'; value: string }
  | { type: 'select'; value: string }
  | { type: 'multi_select'; value: string[] }
  | { type: 'date'; value: string | null }
  | { type: 'checkbox'; value: boolean }
  | { type: 'number'; value: number }
  | { type: 'relation'; value: string[] }  // Page IDs
  | { type: 'created_time'; value: string }
  | { type: 'last_edited_time'; value: string }

/**
 * Extract text from a Notion rich_text or title property
 */
export function extractText(property: any): string {
  if (!property) return ''
  
  if (property.type === 'title' && Array.isArray(property.title)) {
    return property.title.map((t: any) => t.plain_text || '').join('')
  }
  
  if (property.type === 'rich_text' && Array.isArray(property.rich_text)) {
    return property.rich_text.map((t: any) => t.plain_text || '').join('')
  }
  
  return ''
}

/**
 * Extract select value from a Notion select property
 */
export function extractSelect(property: any): string | null {
  if (!property || property.type !== 'select' || !property.select) {
    return null
  }
  return property.select.name || null
}

/**
 * Extract date from a Notion date property
 */
export function extractDate(property: any): string | null {
  if (!property || property.type !== 'date' || !property.date) {
    return null
  }
  return property.date.start || null
}

/**
 * Extract checkbox value from a Notion checkbox property
 */
export function extractCheckbox(property: any): boolean {
  if (!property || property.type !== 'checkbox') {
    return false
  }
  return property.checkbox || false
}

/**
 * Extract relation IDs from a Notion relation property
 */
export function extractRelation(property: any): string[] {
  if (!property || property.type !== 'relation' || !Array.isArray(property.relation)) {
    return []
  }
  return property.relation.map((r: any) => r.id)
}

/**
 * Build Notion properties object for creating/updating pages
 */
export function buildTitleProperty(text: string): { title: Array<{ text: { content: string } }> } {
  return {
    title: [{ text: { content: text } }]
  }
}

export function buildRichTextProperty(text: string): { rich_text: Array<{ text: { content: string } }> } {
  return {
    rich_text: [{ text: { content: text } }]
  }
}

export function buildSelectProperty(value: string): { select: { name: string } } {
  return {
    select: { name: value }
  }
}

export function buildDateProperty(date: string | null): { date: { start: string } | null } {
  return {
    date: date ? { start: date } : null
  }
}

export function buildCheckboxProperty(checked: boolean): { checkbox: boolean } {
  return {
    checkbox: checked
  }
}

export function buildRelationProperty(pageIds: string[]): { relation: Array<{ id: string }> } {
  return {
    relation: pageIds.map(id => ({ id }))
  }
}
