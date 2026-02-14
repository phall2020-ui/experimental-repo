import React from 'react'

export type Language = 'en' | 'es' | 'fr' | 'de'

const translations: Record<Language, Record<string, string>> = {
  en: {
    'dashboard.title': 'Ticketing Dashboard',
    'dashboard.search': 'Search tickets...',
    'dashboard.filters': 'Filters',
    'dashboard.create': 'Create Ticket',
    'dashboard.refresh': 'Refresh',
    'dashboard.export.csv': 'Export CSV',
    'dashboard.export.json': 'Export JSON',
    'ticket.status': 'Status',
    'ticket.priority': 'Priority',
    'ticket.assigned': 'Assigned',
    'ticket.created': 'Created',
    'ticket.open': 'Open',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'health.title': 'System Health',
    'profile.title': 'User Profile',
    'users.manage': 'Manage Users',
    'users.register': 'Register User'
  },
  es: {
    'dashboard.title': 'Panel de Tickets',
    'dashboard.search': 'Buscar tickets...',
    'dashboard.filters': 'Filtros',
    'dashboard.create': 'Crear Ticket',
    'dashboard.refresh': 'Actualizar',
    'dashboard.export.csv': 'Exportar CSV',
    'dashboard.export.json': 'Exportar JSON',
    'ticket.status': 'Estado',
    'ticket.priority': 'Prioridad',
    'ticket.assigned': 'Asignado',
    'ticket.created': 'Creado',
    'ticket.open': 'Abrir',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.close': 'Cerrar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'health.title': 'Salud del Sistema',
    'profile.title': 'Perfil de Usuario',
    'users.manage': 'Gestionar Usuarios',
    'users.register': 'Registrar Usuario'
  },
  fr: {
    'dashboard.title': 'Tableau de Bord des Tickets',
    'dashboard.search': 'Rechercher des tickets...',
    'dashboard.filters': 'Filtres',
    'dashboard.create': 'Créer un Ticket',
    'dashboard.refresh': 'Actualiser',
    'dashboard.export.csv': 'Exporter CSV',
    'dashboard.export.json': 'Exporter JSON',
    'ticket.status': 'Statut',
    'ticket.priority': 'Priorité',
    'ticket.assigned': 'Assigné',
    'ticket.created': 'Créé',
    'ticket.open': 'Ouvrir',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'health.title': 'Santé du Système',
    'profile.title': 'Profil Utilisateur',
    'users.manage': 'Gérer les Utilisateurs',
    'users.register': 'Enregistrer un Utilisateur'
  },
  de: {
    'dashboard.title': 'Ticket-Dashboard',
    'dashboard.search': 'Tickets suchen...',
    'dashboard.filters': 'Filter',
    'dashboard.create': 'Ticket Erstellen',
    'dashboard.refresh': 'Aktualisieren',
    'dashboard.export.csv': 'CSV Exportieren',
    'dashboard.export.json': 'JSON Exportieren',
    'ticket.status': 'Status',
    'ticket.priority': 'Priorität',
    'ticket.assigned': 'Zugewiesen',
    'ticket.created': 'Erstellt',
    'ticket.open': 'Öffnen',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.close': 'Schließen',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'health.title': 'Systemgesundheit',
    'profile.title': 'Benutzerprofil',
    'users.manage': 'Benutzer Verwalten',
    'users.register': 'Benutzer Registrieren'
  }
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = React.createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(() => {
    const saved = localStorage.getItem('userPreferences')
    if (saved) {
      try {
        const prefs = JSON.parse(saved)
        return prefs.language || 'en'
      } catch {
        return 'en'
      }
    }
    return 'en'
  })

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang)
    const saved = localStorage.getItem('userPreferences')
    const prefs = saved ? JSON.parse(saved) : {}
    prefs.language = lang
    localStorage.setItem('userPreferences', JSON.stringify(prefs))
  }, [])

  const t = React.useCallback((key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = React.useContext(I18nContext)
  if (!context) {
    // Fallback if not in provider
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: string) => key
    }
  }
  return context
}

