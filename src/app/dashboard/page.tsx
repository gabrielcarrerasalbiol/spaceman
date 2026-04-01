import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2" style={{ color: 'var(--text-muted)' }}>
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              This is your skeleton authentication starter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p style={{ color: 'var(--text-muted)' }}>
              You can start building your application from here. This skeleton includes:
            </p>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <li>✓ Next.js 14 with TypeScript</li>
              <li>✓ NextAuth v5 (beta) authentication</li>
              <li>✓ Prisma ORM with PostgreSQL</li>
              <li>✓ Tailwind CSS styling</li>
              <li>✓ Light/Dark theme support</li>
            </ul>
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
                href="/dashboard/settings"
                className="block rounded-lg border p-3 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="font-semibold">Settings</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Manage your profile and password
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
            <CardDescription>
              Your current session details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Email</dt>
                <dd>{session?.user?.email || 'Not available'}</dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>User ID</dt>
                <dd>{(session?.user as any)?.id || 'Not available'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
