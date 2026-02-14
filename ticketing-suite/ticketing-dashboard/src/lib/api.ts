/**
 * API Layer
 * 
 * This file re-exports from notionApi.ts to maintain backward compatibility
 * with all existing imports throughout the application.
 * 
 * The application now uses Notion as the database backend through
 * Vercel Edge Functions.
 */

// Re-export everything from Notion API
export * from './notionApi'

// Export API_BASE for legacy compatibility (NotificationBell uses it)
// Note: With Notion backend, we use the Edge Function proxy
export const API_BASE = '/api/notion'
