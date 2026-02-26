// =============================================================================
// SentinelOps - Notification Panel Component
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, AlertTriangle, Zap, GitBranch, Server, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../services/api';

interface Notification {
  id: string;
  type: 'alert' | 'threat' | 'pipeline' | 'agent';
  title: string;
  message: string;
  severity?: string;
  timestamp: string;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  threat: <Zap className="w-4 h-4 text-red-400" />,
  pipeline: <GitBranch className="w-4 h-4 text-purple-400" />,
  agent: <Server className="w-4 h-4 text-cyan-400" />,
};

const severityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Fetch recent alerts as notifications
  const { data: alertsData } = useQuery({
    queryKey: ['notification-alerts'],
    queryFn: () => api.get('/alerts', { params: { limit: 10, sort: '-timestamp' } }).then(res => res.data),
    enabled: isOpen,
    refetchInterval: 15000,
  });

  // Transform alerts to notifications
  useEffect(() => {
    if (alertsData?.data) {
      const notifications: Notification[] = alertsData.data.map((alert: any) => ({
        id: alert.alertId,
        type: 'alert' as const,
        title: alert.rule?.name || 'Security Alert',
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp,
        read: alert.status !== 'new',
      }));
      setLocalNotifications(notifications);
    }
  }, [alertsData]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const unreadCount = localNotifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-16 right-4 z-50 w-96 max-h-[calc(100vh-5rem)] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-slide-down"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-cyan-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
          {localNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell className="w-8 h-8 mb-2" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            localNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`flex items-start space-x-3 p-4 border-b border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-700/30 ${
                  !notification.read ? 'bg-gray-900/50' : ''
                }`}
              >
                {/* Unread indicator */}
                <div className="flex-shrink-0 mt-1">
                  {!notification.read ? (
                    <div className={`w-2 h-2 rounded-full ${severityDot[notification.severity || 'medium']}`} />
                  ) : (
                    <div className="w-2 h-2" />
                  )}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {typeIcons[notification.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-gray-400'}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </p>
                </div>

                {/* Read check */}
                {notification.read && (
                  <Check className="w-3 h-3 text-gray-600 flex-shrink-0 mt-1" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 text-center">
          <a
            href="/alerts"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View all alerts →
          </a>
        </div>
      </div>
    </>
  );
}
