import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-strong)]">Dashboard</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              This is your starter template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-[var(--text-muted)]">
            <p>✅ Next.js 14 with TypeScript</p>
            <p>✅ Prisma ORM with PostgreSQL</p>
            <p>✅ NextAuth v5 authentication</p>
            <p>✅ Tailwind CSS styling</p>
            <p>✅ Light/Dark theme support</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Common actions and pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a
                href="/dashboard/locations"
                className="block rounded-lg border border-[var(--border)] p-3 transition hover:bg-[var(--surface-1)]"
              >
                <div className="font-semibold text-[var(--text-strong)]">Locations</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Manage branches and site records
                </div>
              </a>
              <a
                href="/dashboard/units"
                className="block rounded-lg border border-[var(--border)] p-3 transition hover:bg-[var(--surface-1)]"
              >
                <div className="font-semibold text-[var(--text-strong)]">Units</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Track availability and rates
                </div>
              </a>
              <a
                href="/dashboard/clients"
                className="block rounded-lg border border-[var(--border)] p-3 transition hover:bg-[var(--surface-1)]"
              >
                <div className="font-semibold text-[var(--text-strong)]">Clients</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Maintain customer records
                </div>
              </a>
              <a
                href="/dashboard/contracts"
                className="block rounded-lg border border-[var(--border)] p-3 transition hover:bg-[var(--surface-1)]"
              >
                <div className="font-semibold text-[var(--text-strong)]">Contracts</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Link clients, units and terms
                </div>
              </a>
              <a
                href="/dashboard/settings"
                className="block rounded-lg border border-[var(--border)] p-3 transition hover:bg-[var(--surface-1)]"
              >
                <div className="font-semibold text-[var(--text-strong)]">Settings</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Manage your profile and password
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
            <CardDescription>
              Your current session details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--text-muted)]">Email</dt>
                <dd className="text-[var(--text-strong)]">{session?.user?.email || 'Not available'}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--text-muted)]">User ID</dt>
                <dd className="text-[var(--text-strong)]">{(session?.user as any)?.id || 'Not available'}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--text-muted)]">Role</dt>
                <dd className="text-[var(--text-strong)]">{(session?.user as any)?.role || 'User'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
