import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/api';
import axios from 'axios';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  ticketId?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  const getUserStorageKey = useCallback(() => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    return `notifications:lastRefresh:${userId}`;
  }, []);

  const refreshDailyDigests = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const storageKey = getUserStorageKey();
    const lastRun = localStorage.getItem(storageKey);

    if (lastRun === todayKey) {
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/notifications/daily-refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      localStorage.setItem(storageKey, todayKey);
    } catch (error) {
      console.error('Failed to refresh notifications digest:', error);
    }
  }, [getUserStorageKey]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, []);

  useEffect(() => {
    const initialise = async () => {
      await refreshDailyDigests();
      await loadUnreadCount();
    };
    initialise();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void (async () => {
          await refreshDailyDigests();
          await loadUnreadCount();
        })();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshDailyDigests, loadUnreadCount]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const togglePanel = () => {
    if (!showPanel) {
      void (async () => {
        await refreshDailyDigests();
        await loadNotifications();
        await loadUnreadCount();
      })();
    }
    setShowPanel(!showPanel);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TICKET_CREATED': return '🎫';
      case 'TICKET_UPDATED': return '✏️';
      case 'TICKET_ASSIGNED': return '👤';
      case 'TICKET_COMMENTED': return '💬';
      case 'TICKET_RESOLVED': return '✅';
      case 'RECURRING_TICKET_GENERATED': return '🔄';
      case 'TICKET_ACTIVITY_DIGEST': return '📝';
      case 'TICKET_DUE_SOON': return '⏰';
      default: return '🔔';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={togglePanel}
        style={{
          position: 'relative',
          background: 'transparent',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '20px',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--bad)',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowPanel(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              width: '400px',
              maxHeight: '500px',
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px' }}>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F3F4F6',
                      cursor: notification.isRead ? 'default' : 'pointer',
                      background: notification.isRead ? 'transparent' : '#F9FAFB',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ fontSize: '24px' }}>{getNotificationIcon(notification.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>
                          {notification.title}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                          {notification.message}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            marginTop: '4px',
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
