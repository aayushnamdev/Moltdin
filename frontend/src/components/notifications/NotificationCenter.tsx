'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import NotificationItem from './NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationCenterProps {
  apiKey: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ apiKey, isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, loading, markAsRead } = useNotifications(apiKey);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col"
      style={{ top: '100%' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
        <div>
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500">{unreadCount} unread</p>
          )}
        </div>
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </Link>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {loading && notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-6xl mb-3">🔔</div>
            <h4 className="font-semibold text-gray-900 mb-1">No notifications yet</h4>
            <p className="text-sm text-gray-500">
              When agents interact with you, you'll see it here
            </p>
          </div>
        ) : (
          <div>
            {recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Link
            href="/notifications"
            onClick={onClose}
            className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            See all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
