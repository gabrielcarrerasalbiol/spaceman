'use client';

import { Bell, Trash2, Check, CheckCheck, Filter, ArrowUpDown } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatRelativeTime } from '@/components/dashboard-shell';
import { useState } from 'react';

type NotificationFilter = 'all' | 'unread' | 'read';
type NotificationType = 'all' | 'warning' | 'info' | 'success' | 'danger';
type SortOrder = 'newest' | 'oldest';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filterType, setFilterType] = useState<NotificationType>('all');
  const [filterRead, setFilterRead] = useState<NotificationFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  function handleMarkAsRead(id: string) {
    markAsRead(id);
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this notification?')) {
      deleteNotification(id);
    }
  }

  const filteredNotifications = notifications
    .filter((n) => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterRead === 'unread' && n.read) return false;
      if (filterRead === 'read' && !n.read) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
    });

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Notifications</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-strong)]">Type:</span>
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'danger', label: 'Alert' },
                  { value: 'success', label: 'Success' },
                  { value: 'info', label: 'Info' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value as NotificationType)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      backgroundColor: filterType === option.value ? 'var(--primary)' : 'var(--surface-1)',
                      color: filterType === option.value ? 'white' : 'var(--text-strong)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-6 w-px bg-[var(--border)]" />

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-strong)]">Status:</span>
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'unread', label: 'Unread' },
                  { value: 'read', label: 'Read' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterRead(option.value as NotificationFilter)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      backgroundColor: filterRead === option.value ? 'var(--primary)' : 'var(--surface-1)',
                      color: filterRead === option.value ? 'white' : 'var(--text-strong)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-6 w-px bg-[var(--border)]" />

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-strong)]">Sort:</span>
              <div className="flex gap-1">
                {[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortOrder(option.value as SortOrder)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      backgroundColor: sortOrder === option.value ? 'var(--primary)' : 'var(--surface-1)',
                      color: sortOrder === option.value ? 'white' : 'var(--text-strong)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto text-xs text-[var(--text-muted)]">
              {filteredNotifications.length} of {notifications.length}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>
            {filteredNotifications.length} of {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="mb-4 h-16 w-16 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-lg font-semibold text-[var(--text-strong)]">No notifications</h3>
              <p className="text-sm text-[var(--text-muted)]">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group flex items-start gap-4 rounded-xl border p-4 transition-all hover:shadow-md ${
                    !notification.read ? 'bg-opacity-50' : ''
                  }`}
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: !notification.read ? 'var(--surface-1)' : 'var(--surface-0)',
                  }}
                >
                  <div className={`mt-1 flex h-3 w-3 flex-shrink-0 rounded-full ${
                    notification.type === 'warning' ? 'bg-amber-500' :
                    notification.type === 'danger' ? 'bg-red-500' :
                    notification.type === 'success' ? 'bg-green-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${
                          !notification.read ? 'text-[var(--text-strong)]' : 'text-[var(--text-muted)]'
                        }`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm mt-1 text-[var(--text-muted)]">
                          {notification.message}
                        </p>
                        <p className="text-xs mt-2 text-[var(--text-muted)]">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: 'var(--text-muted)' }}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="rounded-lg p-2 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                          style={{ color: 'var(--danger)' }}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {notification.actionUrl && (
                      <Link
                        href={notification.actionUrl}
                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                        className="mt-3 inline-flex items-center text-sm font-medium transition hover:underline"
                        style={{ color: 'var(--primary)' }}
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
