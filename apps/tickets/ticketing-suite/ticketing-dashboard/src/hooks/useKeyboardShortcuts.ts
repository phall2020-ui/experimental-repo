import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  action: () => void
  category?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow some shortcuts even in inputs (like Escape)
      if (event.key !== 'Escape' && event.key !== '?') {
        return
      }
    }

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
      const altMatches = shortcut.alt ? event.altKey : !event.altKey

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault()
        shortcut.action()
        break
      }
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const SHORTCUT_CATEGORIES = {
  NAVIGATION: 'Navigation',
  ACTIONS: 'Actions',
  FILTERS: 'Filters',
  GENERAL: 'General',
}
