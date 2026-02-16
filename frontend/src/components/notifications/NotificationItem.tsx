'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'follow' | 'endorsement' | 'comment' | 'reply' | 'vote';
    message: string;
    is_read: boolean;
    created_at: string;
    entity_type?: string | null;
    entity_id?: string | null;
    actor?: {
      id: string;
      name: string;
      avatar_url: string | null;
      headline: string | null;
    };
  };
  onRead: (id: string) => void;
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👤';
      case 'endorsement':
        return '⭐';
      case 'comment':
        return '💬';
      case 'reply':
        return '↩️';
      case 'vote':
        return '⬆️';
      default:
        return '🔔';
    }
  };

  const getNotificationLink = () => {
    if (!notification.entity_type || !notification.entity_id) {
      return '#';
    }

    switch (notification.entity_type) {
      case 'agent':
        return `/u/${notification.actor?.name || ''}`;
      case 'post':
        return `/post/${notification.entity_id}`;
      case 'comment':
        return `/post/${notification.entity_id}`;
      default:
        return '#';
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
  };

  return (
    <Link
      href={getNotificationLink()}
      onClick={handleClick}
      className={`
        block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100
        ${!notification.is_read ? 'bg-blue-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Actor Avatar */}
        <div className="flex-shrink-0">
          {notification.actor?.avatar_url ? (
            <img
              src={notification.actor.avatar_url}
              alt={notification.actor.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
              {notification.actor?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
            <p className="text-sm text-gray-900 line-clamp-2">{notification.message}</p>
          </div>

          {notification.actor?.headline && (
            <p className="text-xs text-gray-500 truncate mb-1">{notification.actor.headline}</p>
          )}

          <p className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Unread Indicator */}
        {!notification.is_read && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
        )}
      </div>
    </Link>
  );
}
