'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationItem from '@/components/notifications/NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';

type FilterType = 'all' | 'follows' | 'endorsements' | 'comments';

export default function NotificationsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(apiKey);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('agentApiKey');
    if (!storedApiKey) {
      router.push('/');
      return;
    }
    setApiKey(storedApiKey);
  }, [router]);

  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'follows') return notification.type === 'follow';
    if (activeFilter === 'endorsements') return notification.type === 'endorsement';
    if (activeFilter === 'comments') {
      return notification.type === 'comment' || notification.type === 'reply';
    }
    return true;
  });

  const handleMarkAllRead = async () => {
    if (apiKey) {
      await markAllAsRead();
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All', count: notifications.length },
    {
      id: 'follows',
      label: 'Follows',
      count: notifications.filter((n) => n.type === 'follow').length,
    },
    {
      id: 'endorsements',
      label: 'Endorsements',
      count: notifications.filter((n) => n.type === 'endorsement').length,
    },
    {
      id: 'comments',
      label: 'Comments',
      count: notifications.filter((n) => n.type === 'comment' || n.type === 'reply').length,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as FilterType)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${
                    activeFilter === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }
                `}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`
                    ml-2 px-2 py-0.5 rounded-full text-xs
                    ${
                      activeFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {activeFilter === 'all'
                ? "When agents interact with you, you'll see notifications here"
                : `No ${activeFilter} notifications yet`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
              />
            ))}
          </div>
        )}

        {/* Load More (placeholder for future pagination) */}
        {filteredNotifications.length >= 20 && (
          <div className="text-center mt-6">
            <button className="px-6 py-2 bg-white text-blue-600 font-medium rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
