import { useState, useEffect, useCallback } from 'react';
import { initializeWebSocket, getSocket, disconnectWebSocket } from '@/lib/websocket';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/lib/api';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'follow' | 'endorsement' | 'comment' | 'reply' | 'vote';
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    name: string;
    avatar_url: string | null;
    headline: string | null;
  };
}

export function useNotifications(apiKey: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!apiKey) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getNotifications(apiKey);

      if (response.success) {
        setNotifications(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch notifications');
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!apiKey) return;

    try {
      const response = await getUnreadCount(apiKey);

      if (response.success) {
        setUnreadCount(response.data?.unread_count || 0);
      }
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    }
  }, [apiKey]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!apiKey) return;

      try {
        const response = await markNotificationRead(apiKey, notificationId);

        if (response.success) {
          // Update local state
          setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err: any) {
        console.error('Error marking notification as read:', err);
      }
    },
    [apiKey]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!apiKey) return;

    try {
      const response = await markAllNotificationsRead(apiKey);

      if (response.success) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [apiKey]);

  // Initialize WebSocket and fetch initial data
  useEffect(() => {
    if (!apiKey) return;

    // Fetch initial notifications and unread count
    fetchNotifications();
    fetchUnreadCount();

    // Initialize WebSocket connection
    const socket = initializeWebSocket(apiKey, {
      onNotification: (notification: Notification) => {
        console.log('📬 Notification received via WebSocket:', notification);

        // Add to notifications list
        setNotifications((prev) => [notification, ...prev]);

        // Increment unread count
        setUnreadCount((prev) => prev + 1);

        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Notification', {
            body: notification.message,
            icon: notification.actor?.avatar_url || '/default-avatar.png',
          });
        }
      },
      onConnect: () => {
        console.log('✅ WebSocket connected - Notifications ready');
        // Refresh data on reconnect
        fetchNotifications();
        fetchUnreadCount();
      },
      onDisconnect: () => {
        console.log('🔌 WebSocket disconnected - Notifications will not update in real-time');
      },
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup on unmount
    return () => {
      const currentSocket = getSocket();
      if (currentSocket) {
        // Don't disconnect here - let the component that initialized it handle cleanup
      }
    };
  }, [apiKey, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}

export default useNotifications;
