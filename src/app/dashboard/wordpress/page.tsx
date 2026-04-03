import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Globe, MapPin, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type WordPressConfig = {
  siteUrl: string;
  apiUsername: string;
  apiPassword: string;
  enabled: boolean;
  locationsEndpoint: string;
  unitsEndpoint: string;
};

type WordPressLocation = {
  id: number | string;
  title?: string;
  slug?: string;
  meta?: {
    town_city?: string;
    postcode?: string;
    phone?: string;
  };
};

type WordPressUnit = {
  id: number | string;
  title?: string;
  slug?: string;
  meta?: {
    code?: string;
    status?: string;
    location_id?: string | number;
  };
};

function normalizeWordPressConfig(input: unknown): WordPressConfig {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  return {
    siteUrl: typeof source.siteUrl === 'string' ? source.siteUrl : '',
    apiUsername: typeof source.apiUsername === 'string' ? source.apiUsername : '',
    apiPassword: typeof source.apiPassword === 'string' ? source.apiPassword : '',
    enabled: Boolean(source.enabled),
    locationsEndpoint: typeof source.locationsEndpoint === 'string' ? source.locationsEndpoint : 'wp-json/spaceman/v1/locations',
    unitsEndpoint: typeof source.unitsEndpoint === 'string' ? source.unitsEndpoint : 'wp-json/spaceman/v1/units',
  };
}

function buildWordPressUrl(siteUrl: string, endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return `${siteUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

async function fetchWordPressJson<T>(url: string, username: string, password: string): Promise<T> {
  const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  if (!response.ok) {
    throw new Error(`WordPress request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

type WordPressPageProps = {
  searchParams?: {
    refresh?: string;
  };
};

export default async function WordPressPage({ searchParams }: WordPressPageProps) {
  await auth();

  const settings = await prisma.settings.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { wordpressConfig: true },
  });

  const config = normalizeWordPressConfig(settings?.wordpressConfig);
  const isConfigured =
    config.enabled &&
    config.siteUrl.trim().length > 0 &&
    config.apiUsername.trim().length > 0 &&
    config.apiPassword.trim().length > 0;

  let locations: WordPressLocation[] = [];
  let units: WordPressUnit[] = [];
  let locationsError = '';
  let unitsError = '';
  const lastPullAt = searchParams?.refresh
    ? new Date(Number(searchParams.refresh) || Date.now()).toLocaleString()
    : new Date().toLocaleString();

  if (isConfigured) {
    const locationsUrl = buildWordPressUrl(config.siteUrl, config.locationsEndpoint);
    const unitsUrl = buildWordPressUrl(config.siteUrl, config.unitsEndpoint);

    try {
      const payload = await fetchWordPressJson<unknown>(locationsUrl, config.apiUsername, config.apiPassword);
      locations = Array.isArray(payload) ? (payload as WordPressLocation[]) : [];
    } catch (error) {
      locationsError = error instanceof Error ? error.message : 'Unable to fetch locations';
    }

    try {
      const payload = await fetchWordPressJson<unknown>(unitsUrl, config.apiUsername, config.apiPassword);
      units = Array.isArray(payload) ? (payload as WordPressUnit[]) : [];
    } catch (error) {
      unitsError = error instanceof Error ? error.message : 'Unable to fetch units';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WordPress Integration</h1>
        <p className="text-muted-foreground">
          Read-only view of locations and units pulled from WordPress
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WordPress Data</CardTitle>
          <CardDescription>
            View locations and units currently available in WordPress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Last pull attempt: {lastPullAt}
            </p>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/wordpress?refresh=${Date.now()}`}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Force Pull Now
              </Link>
            </Button>
          </div>

          {!isConfigured && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Configure and enable WordPress credentials in{' '}
              <Link href="/dashboard/settings" className="underline font-medium" style={{ color: 'var(--accent)' }}>
                Settings
              </Link>{' '}
              to load locations and units.
            </p>
          )}

          {isConfigured && (
            <Tabs defaultValue="locations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="locations">
                  <MapPin className="mr-2 h-4 w-4" />
                  Locations
                </TabsTrigger>
                <TabsTrigger value="units">
                  <Package className="mr-2 h-4 w-4" />
                  Units
                </TabsTrigger>
              </TabsList>

              <TabsContent value="locations" className="space-y-3">
                {locationsError ? (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{locationsError}</p>
                ) : (
                  <>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Pulled {locations.length} locations from {buildWordPressUrl(config.siteUrl, config.locationsEndpoint)}
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Postcode</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => (
                        <TableRow key={String(location.id)}>
                          <TableCell>{location.title || '-'}</TableCell>
                          <TableCell>{location.meta?.town_city || '-'}</TableCell>
                          <TableCell>{location.meta?.postcode || '-'}</TableCell>
                          <TableCell>{location.meta?.phone || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {locations.length === 0 && (
                        <TableRow>
                          <TableCell className="text-sm" colSpan={4}>No locations found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </>
                )}
              </TabsContent>

              <TabsContent value="units" className="space-y-3">
                {unitsError ? (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{unitsError}</p>
                ) : (
                  <>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Pulled {units.length} units from {buildWordPressUrl(config.siteUrl, config.unitsEndpoint)}
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit) => (
                        <TableRow key={String(unit.id)}>
                          <TableCell>{unit.title || '-'}</TableCell>
                          <TableCell>{unit.meta?.code || '-'}</TableCell>
                          <TableCell>{unit.meta?.status || '-'}</TableCell>
                          <TableCell>{String(unit.meta?.location_id ?? '-')}</TableCell>
                        </TableRow>
                      ))}
                      {units.length === 0 && (
                        <TableRow>
                          <TableCell className="text-sm" colSpan={4}>No units found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Globe className="h-3.5 w-3.5" />
            Read-only mode enabled. Push sync from Spaceman to WordPress will be added later with restrictions.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
