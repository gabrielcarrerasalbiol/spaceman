import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, RefreshCw } from 'lucide-react';

export default async function WordPressPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">WordPress Integration</h1>
        <p className="text-muted-foreground">
          Sync locations and units with WordPress
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border)'
      }}>
        <CardContent className="pt-6">
          <p className="text-sm" style={{ color: 'var(--text-strong)' }}>
            WordPress integration is coming soon! Configure the API credentials in{' '}
            <Link href="/dashboard/settings" className="underline font-medium" style={{ color: 'var(--accent)' }}>
              Settings
            </Link>{' '}
            to enable the integration.
          </p>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Follow these steps to enable WordPress integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Install the Spaceman plugin on your WordPress site</li>
              <li>Configure API credentials in WordPress</li>
              <li>Go to{' '}
                <Link href="/dashboard/settings" className="underline font-medium">
                  Settings
                </Link>{' '}
                and add your WordPress site URL
              </li>
              <li>Enable the integration</li>
              <li>Start syncing locations and units</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>
              What you'll be able to do once configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Bi-directional Sync</p>
                <p className="text-sm text-muted-foreground">
                  Pull locations and units from WordPress or push changes back
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Real-time Status</p>
                <p className="text-sm text-muted-foreground">
                  View sync status and last sync times for all locations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Quick Actions</p>
                <p className="text-sm text-muted-foreground">
                  Sync individual locations or bulk sync all data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Get started with WordPress integration
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 h-4 w-4" />
              Configure Settings
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="/wordpress-plugin-instructions.md" target="_blank" rel="noopener noreferrer">
              View Plugin Instructions
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
