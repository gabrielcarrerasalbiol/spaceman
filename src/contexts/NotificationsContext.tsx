'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);
const NOTIFICATIONS_KEY = 'spaceman_notifications';

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const withDates = parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }));
        setNotifications(withDates);
      } else {
        // Initialize with sample notifications if none exist
        const sampleNotifications: Notification[] = [
          {
            id: '1',
            type: 'warning',
            title: 'Contract Expiring Soon',
            message: 'Contract CTR-20260403-4982 expires in 7 days',
            createdAt: new Date(Date.now() - 1000 * 60 * 30),
            read: false,
            actionUrl: '/dashboard/contracts',
          },
          {
            id: '2',
            type: 'info',
            title: 'New Client Added',
            message: 'Steve Swoffer was added as a new client',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
            read: false,
            actionUrl: '/dashboard/clients',
          },
        ];
        setNotifications(sampleNotifications);
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(sampleNotifications));
      }
    } catch {
      setNotifications([]);
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (notifications.length === 0) return;
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch {
      // Ignore storage errors
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(NOTIFICATIONS_KEY);
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
