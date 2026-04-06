'use client';

import DashboardShell from '@/components/dashboard-shell';
import { NotificationsProvider } from '@/contexts/NotificationsContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationsProvider>
      <DashboardShell>{children}</DashboardShell>
    </NotificationsProvider>
  );
}
