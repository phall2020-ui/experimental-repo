import { useState, useEffect } from 'react'

export interface SavedView {
  id: string
  name: string
  description?: string
  filters: {
    status?: string
    priority?: string
    type?: string
    siteId?: string
    assignedUserId?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    customFieldFilters?: Record<string, string>
  }
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  isPinned?: boolean
  isDefault?: boolean
  createdAt: string
}

const STORAGE_KEY = 'ticketing_saved_views'

export const DEFAULT_VIEWS: SavedView[] = [
  {
    id: 'my-tickets',
    name: 'My Tickets',
    description: 'Tickets assigned to me',
    filters: {
      assignedUserId: 'current-user' // Special marker
    },
    isPinned: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'unassigned',
    name: 'Unassigned',
    description: 'Tickets without an assignee',
    filters: {
      assignedUserId: 'unassigned' // Special marker
    },
    isPinned: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'high-priority',
    name: 'High Priority',
    description: 'P1 and P2 priority tickets',
    filters: {
      priority: 'P1,P2' // Special format for multiple
    },
    isPinned: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'recently-updated',
    name: 'Recently Updated',
    description: 'Tickets updated in the last 24 hours',
    filters: {},
    sortColumn: 'updatedAt',
    sortDirection: 'desc',
    createdAt: new Date().toISOString()
  }
]

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([])
  const [currentViewId, setCurrentViewId] = useState<string | null>(null)

  useEffect(() => {
    loadViews()
  }, [])

  const loadViews = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setViews([...DEFAULT_VIEWS, ...parsed])
      } else {
        setViews(DEFAULT_VIEWS)
      }
    } catch (error) {
      console.error('Failed to load saved views:', error)
      setViews(DEFAULT_VIEWS)
    }
  }

  const saveViews = (newViews: SavedView[]) => {
    try {
      // Only save custom views (not default ones)
      const customViews = newViews.filter(v => !DEFAULT_VIEWS.find(dv => dv.id === v.id))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customViews))
      setViews([...DEFAULT_VIEWS, ...customViews])
    } catch (error) {
      console.error('Failed to save views:', error)
    }
  }

  const createView = (view: Omit<SavedView, 'id' | 'createdAt'>) => {
    const newView: SavedView = {
      ...view,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    saveViews([...views, newView])
    return newView
  }

  const updateView = (id: string, updates: Partial<SavedView>) => {
    const updatedViews = views.map(v => 
      v.id === id ? { ...v, ...updates } : v
    )
    saveViews(updatedViews)
  }

  const deleteView = (id: string) => {
    // Prevent deletion of default views
    if (DEFAULT_VIEWS.find(v => v.id === id)) {
      return false
    }
    const filteredViews = views.filter(v => v.id !== id)
    saveViews(filteredViews)
    if (currentViewId === id) {
      setCurrentViewId(null)
    }
    return true
  }

  const applyView = (viewId: string) => {
    const view = views.find(v => v.id === viewId)
    if (view) {
      setCurrentViewId(viewId)
      return view
    }
    return null
  }

  const togglePin = (id: string) => {
    updateView(id, { isPinned: !views.find(v => v.id === id)?.isPinned })
  }

  const setDefaultView = (id: string) => {
    const updatedViews = views.map(v => ({
      ...v,
      isDefault: v.id === id
    }))
    saveViews(updatedViews)
  }

  const pinnedViews = views.filter(v => v.isPinned)
  const customViews = views.filter(v => !DEFAULT_VIEWS.find(dv => dv.id === v.id))
  const defaultView = views.find(v => v.isDefault)

  return {
    views,
    pinnedViews,
    customViews,
    defaultView,
    currentViewId,
    createView,
    updateView,
    deleteView,
    applyView,
    togglePin,
    setDefaultView,
    setCurrentViewId
  }
}
