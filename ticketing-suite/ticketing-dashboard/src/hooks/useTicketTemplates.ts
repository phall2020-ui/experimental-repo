import { useState, useEffect } from 'react'

export interface TicketTemplate {
  id: string
  name: string
  description?: string
  category?: string
  isGlobal?: boolean
  template: {
    type: string
    priority: string
    status: string
    description: string
    details?: string
    siteId?: string
    custom_fields?: Record<string, any>
  }
  createdAt: string
  usageCount?: number
}

const STORAGE_KEY = 'ticketing_templates'

export const DEFAULT_TEMPLATES: TicketTemplate[] = [
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Standard bug report template',
    category: 'Development',
    isGlobal: true,
    template: {
      type: 'BUG',
      priority: 'P3',
      status: 'NEW',
      description: '[Bug] ',
      details: '**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Behavior:**\n\n\n**Actual Behavior:**\n\n\n**Environment:**\n- Browser: \n- OS: \n'
    },
    createdAt: new Date().toISOString(),
    usageCount: 0
  },
  {
    id: 'feature-request',
    name: 'Feature Request',
    description: 'Request for new feature',
    category: 'Development',
    isGlobal: true,
    template: {
      type: 'FEATURE',
      priority: 'P4',
      status: 'NEW',
      description: '[Feature] ',
      details: '**Problem Statement:**\n\n\n**Proposed Solution:**\n\n\n**Benefits:**\n\n\n**Alternatives Considered:**\n\n'
    },
    createdAt: new Date().toISOString(),
    usageCount: 0
  },
  {
    id: 'support-request',
    name: 'Support Request',
    description: 'General support ticket',
    category: 'Support',
    isGlobal: true,
    template: {
      type: 'SUPPORT',
      priority: 'P3',
      status: 'NEW',
      description: '[Support] ',
      details: '**Issue Description:**\n\n\n**Impact:**\n\n\n**Urgency:**\n\n'
    },
    createdAt: new Date().toISOString(),
    usageCount: 0
  },
  {
    id: 'incident',
    name: 'Incident Report',
    description: 'Critical incident template',
    category: 'Operations',
    isGlobal: true,
    template: {
      type: 'INCIDENT',
      priority: 'P1',
      status: 'TRIAGE',
      description: '[INCIDENT] ',
      details: '**Incident Summary:**\n\n\n**Impact:**\n\n\n**Timeline:**\n\n\n**Next Steps:**\n\n'
    },
    createdAt: new Date().toISOString(),
    usageCount: 0
  }
]

export function useTicketTemplates() {
  const [templates, setTemplates] = useState<TicketTemplate[]>([])

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setTemplates([...DEFAULT_TEMPLATES, ...parsed])
      } else {
        setTemplates(DEFAULT_TEMPLATES)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      setTemplates(DEFAULT_TEMPLATES)
    }
  }

  const saveTemplates = (newTemplates: TicketTemplate[]) => {
    try {
      const customTemplates = newTemplates.filter(t => !t.isGlobal)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates))
      setTemplates([...DEFAULT_TEMPLATES, ...customTemplates])
    } catch (error) {
      console.error('Failed to save templates:', error)
    }
  }

  const createTemplate = (template: Omit<TicketTemplate, 'id' | 'createdAt' | 'usageCount'>) => {
    const newTemplate: TicketTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      usageCount: 0
    }
    saveTemplates([...templates, newTemplate])
    return newTemplate
  }

  const updateTemplate = (id: string, updates: Partial<TicketTemplate>) => {
    const updatedTemplates = templates.map(t =>
      t.id === id ? { ...t, ...updates } : t
    )
    saveTemplates(updatedTemplates)
  }

  const deleteTemplate = (id: string) => {
    if (DEFAULT_TEMPLATES.find(t => t.id === id)) {
      return false
    }
    const filteredTemplates = templates.filter(t => t.id !== id)
    saveTemplates(filteredTemplates)
    return true
  }

  const incrementUsage = (id: string) => {
    const template = templates.find(t => t.id === id)
    if (template) {
      updateTemplate(id, { usageCount: (template.usageCount || 0) + 1 })
    }
  }

  const getTemplateById = (id: string) => {
    return templates.find(t => t.id === id)
  }

  const getTemplatesByCategory = (category: string) => {
    return templates.filter(t => t.category === category)
  }

  const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)))
  const customTemplates = templates.filter(t => !t.isGlobal)
  const popularTemplates = [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 5)

  return {
    templates,
    categories,
    customTemplates,
    popularTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    getTemplateById,
    getTemplatesByCategory
  }
}
