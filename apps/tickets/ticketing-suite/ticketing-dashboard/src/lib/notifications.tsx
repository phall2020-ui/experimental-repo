import React from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  showNotification: (type: NotificationType, message: string, duration?: number) => void
  removeNotification: (id: string) => void
}

const NotificationContext = React.createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([])

  const showNotification = React.useCallback((type: NotificationType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const notification: Notification = { id, type, message, duration }
    setNotifications(prev => [...prev, notification])
    
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

  const removeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  )
}

function NotificationContainer({ notifications, onRemove }: { notifications: Notification[], onRemove: (id: string) => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 400,
      pointerEvents: 'none'
    }}>
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => onRemove(n.id)}
          style={{
            pointerEvents: 'auto',
            padding: '12px 16px',
            borderRadius: 8,
            background: n.type === 'success' ? '#2ecc71' : n.type === 'error' ? '#e74c3c' : n.type === 'warning' ? '#f1c40f' : '#5b9cff',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            fontSize: 14,
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {n.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export function useNotifications() {
  const context = React.useContext(NotificationContext)
  if (!context) {
    // Fallback if not in provider
    return {
      notifications: [],
      showNotification: (type: NotificationType, message: string) => console.log(`[${type}] ${message}`),
      removeNotification: () => {}
    }
  }
  return context
}

