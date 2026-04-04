'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Globe, MapPin, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';

type WordPressConfig = {
  siteUrl: string;
  apiUsername: string;
  apiPassword: string;
  enabled: boolean;
  locationsEndpoint: string;
  unitsEndpoint: string;
};

type PullCache = {
  locations: any[];
  units: any[];
  lastPulledAt: string | null;
  lastPullErrors: {
    locations?: string;
    units?: string;
  };
};

type DetailModalState = {
  open: boolean;
  title: string;
  payload: unknown;
};

function isTruthyFlag(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

function isMissingValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function getUnitField(unit: any, ...keys: string[]) {
  const meta = unit?.meta && typeof unit.meta === 'object' ? unit.meta : {};
  const allMeta = unit?.all_meta && typeof unit.all_meta === 'object' ? unit.all_meta : {};

  for (const key of keys) {
    const topLevelValue = unit?.[key];
    if (!isMissingValue(topLevelValue)) return topLevelValue;

    const metaValue = meta?.[key];
    if (!isMissingValue(metaValue)) return metaValue;

    const allMetaValue = allMeta?.[key];
    if (!isMissingValue(allMetaValue)) return allMetaValue;
  }

  return null;
}

function renderValue(value: unknown) {
  if (isMissingValue(value)) return '-';
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractFeaturedImageUrl(payload: unknown): string | null {
  const source = asRecord(payload);
  const acf = asRecord(source.acf);
  const meta = asRecord(source.meta);
  const embedded = asRecord(source._embedded);
  const wpFeaturedMedia = Array.isArray(embedded['wp:featuredmedia']) ? embedded['wp:featuredmedia'] : [];
  const firstFeaturedMedia = wpFeaturedMedia.length > 0 ? asRecord(wpFeaturedMedia[0]) : {};

  const candidates: unknown[] = [
    source.featured_image_url,
    meta.featured_image_url,
    acf.featured_image_url,
    source.featured_image,
    asRecord(source.featured_image).url,
    asRecord(source.featured_image).source_url,
    source.image,
    asRecord(source.image).url,
    asRecord(source.image).source_url,
    source.unit_image,
    acf.unit_image,
    meta.unit_image,
    asRecord(acf.main_image).url,
    asRecord(meta.main_image).url,
    asRecord(source.main_image).url,
    firstFeaturedMedia.source_url,
    asRecord(firstFeaturedMedia.media_details).sizes?.full && asRecord(asRecord(firstFeaturedMedia.media_details).sizes?.full).source_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function buildWordPressUrl(siteUrl: string, endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${siteUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

const WORDPRESS_PAGE_SIZE = 25;

export default function WordPressDataView() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WordPressConfig | null>(null);
  const [cache, setCache] = useState<PullCache>({
    locations: [],
    units: [],
    lastPulledAt: null,
    lastPullErrors: {},
  });

  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [pullRunning, setPullRunning] = useState(false);
  const [pullLogs, setPullLogs] = useState<string[]>([]);
  const [pullSummary, setPullSummary] = useState<{ ok: boolean; text: string } | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModalState>({
    open: false,
    title: '',
    payload: null,
  });
  const [locationsPage, setLocationsPage] = useState(1);
  const [unitsPage, setUnitsPage] = useState(1);

  const isConfigured = useMemo(() => {
    if (!config) return false;
    return (
      config.enabled &&
      config.siteUrl.trim().length > 0 &&
      config.apiUsername.trim().length > 0 &&
      config.apiPassword.trim().length > 0
    );
  }, [config]);

  const lastPullText = cache.lastPulledAt
    ? new Date(cache.lastPulledAt).toLocaleString()
    : 'Never';
  const detailFeaturedImageUrl = useMemo(() => extractFeaturedImageUrl(detailModal.payload), [detailModal.payload]);

  const locationsTotalPages = Math.max(1, Math.ceil(cache.locations.length / WORDPRESS_PAGE_SIZE));
  const unitsTotalPages = Math.max(1, Math.ceil(cache.units.length / WORDPRESS_PAGE_SIZE));

  const safeLocationsPage = Math.min(locationsPage, locationsTotalPages);
  const safeUnitsPage = Math.min(unitsPage, unitsTotalPages);

  const paginatedLocations = useMemo(() => {
    const start = (safeLocationsPage - 1) * WORDPRESS_PAGE_SIZE;
    return cache.locations.slice(start, start + WORDPRESS_PAGE_SIZE);
  }, [cache.locations, safeLocationsPage]);

  const paginatedUnits = useMemo(() => {
    const start = (safeUnitsPage - 1) * WORDPRESS_PAGE_SIZE;
    return cache.units.slice(start, start + WORDPRESS_PAGE_SIZE);
  }, [cache.units, safeUnitsPage]);

  useEffect(() => {
    if (locationsPage > locationsTotalPages) {
      setLocationsPage(locationsTotalPages);
    }
  }, [locationsPage, locationsTotalPages]);

  useEffect(() => {
    if (unitsPage > unitsTotalPages) {
      setUnitsPage(unitsTotalPages);
    }
  }, [unitsPage, unitsTotalPages]);

  async function loadState() {
    setLoading(true);
    try {
      const response = await fetch('/api/wordpress/pull', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load WordPress data state');
      }

      setConfig(payload.config);
      setCache(payload.cache);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Failed to load WordPress data state';
      setPullSummary({ ok: false, text });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadState();
  }, []);

  async function handleForcePull() {
    setPullModalOpen(true);
    setPullRunning(true);
    setPullSummary(null);
    setPullLogs(['Preparing pull request...']);

    try {
      const response = await fetch('/api/wordpress/pull', { method: 'POST' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Pull failed');
      }

      const logs = Array.isArray(payload?.logs) ? payload.logs : [];
      setPullLogs((prev) => [...prev, ...logs]);
      setCache(payload.cache);

      const hasErrors = Boolean(payload.cache?.lastPullErrors?.locations || payload.cache?.lastPullErrors?.units);
      setPullSummary({
        ok: !hasErrors,
        text: hasErrors
          ? 'Pull completed with endpoint errors. Cached data was still updated.'
          : 'Pull completed successfully and data is now cached in database.',
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Pull failed';
      setPullLogs((prev) => [...prev, `Error: ${text}`]);
      setPullSummary({ ok: false, text });
    } finally {
      setPullRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WordPress Integration</h1>
        <p className="text-muted-foreground">Read-only view with pull cache persisted in database</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WordPress Data</CardTitle>
          <CardDescription>View locations and units currently available in WordPress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Last pull attempt: {lastPullText}
            </p>
            <Button variant="outline" onClick={handleForcePull} disabled={pullRunning || loading || !isConfigured}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {pullRunning ? 'Pulling...' : 'Force Pull Now'}
            </Button>
          </div>

          {!isConfigured && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Configure and enable WordPress credentials in{' '}
              <Link href="/dashboard/settings" className="underline font-medium" style={{ color: 'var(--accent)' }}>
                Settings
              </Link>{' '}
              to pull and cache locations and units.
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
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Pulled {cache.locations.length} locations from {config ? buildWordPressUrl(config.siteUrl, config.locationsEndpoint) : '-'}
                </p>
                {cache.lastPullErrors?.locations && (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{cache.lastPullErrors.locations}</p>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Postcode</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLocations.map((location: any, index: number) => (
                      <TableRow key={`${String(location.id ?? 'location')}-${index}`}>
                        <TableCell>{location.title || '-'}</TableCell>
                        <TableCell>{location.meta?.town_city || '-'}</TableCell>
                        <TableCell>{location.meta?.postcode || '-'}</TableCell>
                        <TableCell>{location.meta?.phone || '-'}</TableCell>
                        <TableCell>
                          {location.__match?.matched ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>Matched</p>
                              <Link
                                href={`/dashboard/locations/${location.__match.cmsId}/edit`}
                                className="text-xs underline"
                                style={{ color: 'var(--accent)' }}
                              >
                                Open CMS location
                              </Link>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No match</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() =>
                              setDetailModal({
                                open: true,
                                title: `Location: ${location.title || location.id || 'Unknown'}`,
                                payload: location,
                              })
                            }
                            className="text-xs underline"
                            style={{ color: 'var(--accent)' }}
                          >
                            View details
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cache.locations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-sm">No locations found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {cache.locations.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Showing {(safeLocationsPage - 1) * WORDPRESS_PAGE_SIZE + 1} to {Math.min(safeLocationsPage * WORDPRESS_PAGE_SIZE, cache.locations.length)} of {cache.locations.length} locations
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocationsPage((page) => Math.max(1, page - 1))}
                        disabled={safeLocationsPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="min-w-[110px] text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        Page {safeLocationsPage} of {locationsTotalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocationsPage((page) => Math.min(locationsTotalPages, page + 1))}
                        disabled={safeLocationsPage >= locationsTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="units" className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Pulled {cache.units.length} units from {config ? buildWordPressUrl(config.siteUrl, config.unitsEndpoint) : '-'}
                </p>
                {cache.lastPullErrors?.units && (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>{cache.lastPullErrors.units}</p>
                )}
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[14%]">Title</TableHead>
                      <TableHead className="w-[7%]">Code</TableHead>
                      <TableHead className="w-[6%]">Status</TableHead>
                      <TableHead className="w-[6%]">Location ID</TableHead>
                      <TableHead className="w-[6%]">Sale Price</TableHead>
                      <TableHead className="w-[8%]">Regular Weekly Rate</TableHead>
                      <TableHead className="w-[20%]">Prorize Offer</TableHead>
                      <TableHead className="w-[6%]">Prorize On Sale</TableHead>
                      <TableHead className="w-[6%]">Active</TableHead>
                      <TableHead className="w-[9%]">Prorize ID</TableHead>
                      <TableHead className="w-[9%]">Match</TableHead>
                      <TableHead className="w-[4%]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUnits.map((unit: any, index: number) => (
                      <TableRow key={`${String(unit.id ?? 'unit')}-${index}`}>
                        <TableCell className="truncate" title={String(unit.title || '-')}>{unit.title || '-'}</TableCell>
                        <TableCell className="truncate">{renderValue(getUnitField(unit, 'code', 'size_code', 'size_display', 'display_name'))}</TableCell>
                        <TableCell className="truncate">{renderValue(getUnitField(unit, 'status'))}</TableCell>
                        <TableCell className="truncate">{renderValue(getUnitField(unit, 'location_id'))}</TableCell>
                        <TableCell className="truncate">{renderValue(getUnitField(unit, 'sale_price'))}</TableCell>
                        <TableCell className="truncate">{renderValue(getUnitField(unit, 'regular_weekly_rate', 'weekly_rate'))}</TableCell>
                        <TableCell
                          className="truncate"
                          title={String(getUnitField(unit, 'prorize_offer') ?? '')}
                        >
                          {renderValue(getUnitField(unit, 'prorize_offer'))}
                        </TableCell>
                        <TableCell>
                          {isTruthyFlag(getUnitField(unit, 'prorize_onsale')) ? (
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--success) 50%, var(--border))',
                                backgroundColor: 'color-mix(in srgb, var(--success) 14%, var(--surface-0))',
                                color: 'var(--success)',
                              }}
                            >
                              YES
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--danger) 50%, var(--border))',
                                backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface-0))',
                                color: 'var(--danger)',
                              }}
                            >
                              NO
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isTruthyFlag(getUnitField(unit, 'active')) ? (
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--success) 50%, var(--border))',
                                backgroundColor: 'color-mix(in srgb, var(--success) 14%, var(--surface-0))',
                                color: 'var(--success)',
                              }}
                            >
                              YES
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--danger) 50%, var(--border))',
                                backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface-0))',
                                color: 'var(--danger)',
                              }}
                            >
                              NO
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="truncate break-all" title={String(getUnitField(unit, 'prorize_id') ?? '')}>{renderValue(getUnitField(unit, 'prorize_id'))}</TableCell>
                        <TableCell>
                          {unit.__match?.matched ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>Matched</p>
                              <Link
                                href={`/dashboard/units/${unit.__match.cmsId}/edit`}
                                className="text-xs underline"
                                style={{ color: 'var(--accent)' }}
                              >
                                Open CMS unit
                              </Link>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No match</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() =>
                              setDetailModal({
                                open: true,
                                title: `Unit: ${unit.title || unit.id || 'Unknown'}`,
                                payload: unit,
                              })
                            }
                            className="text-xs underline"
                            style={{ color: 'var(--accent)' }}
                          >
                            View details
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cache.units.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-sm">No units found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {cache.units.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Showing {(safeUnitsPage - 1) * WORDPRESS_PAGE_SIZE + 1} to {Math.min(safeUnitsPage * WORDPRESS_PAGE_SIZE, cache.units.length)} of {cache.units.length} units
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUnitsPage((page) => Math.max(1, page - 1))}
                        disabled={safeUnitsPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="min-w-[110px] text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        Page {safeUnitsPage} of {unitsTotalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUnitsPage((page) => Math.min(unitsTotalPages, page + 1))}
                        disabled={safeUnitsPage >= unitsTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Globe className="h-3.5 w-3.5" />
            Read-only mode enabled. Pull now stores WordPress data in the database cache for this section.
          </div>
        </CardContent>
      </Card>

      <Modal
        open={pullModalOpen}
        onClose={() => {
          if (!pullRunning) setPullModalOpen(false);
        }}
        title="WordPress Pull Progress"
        description="Live pull status and final result"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {pullSummary && (
            <div
              className="rounded-xl border p-3"
              style={{
                borderColor: pullSummary.ok
                  ? 'color-mix(in srgb, var(--success) 45%, var(--border))'
                  : 'color-mix(in srgb, var(--danger) 45%, var(--border))',
                backgroundColor: pullSummary.ok
                  ? 'color-mix(in srgb, var(--success) 12%, var(--surface-0))'
                  : 'color-mix(in srgb, var(--danger) 12%, var(--surface-0))',
              }}
            >
              <p className="text-sm font-medium" style={{ color: pullSummary.ok ? 'var(--success)' : 'var(--danger)' }}>
                {pullSummary.text}
              </p>
            </div>
          )}

          <div className="rounded-xl border p-3 h-64 overflow-y-auto text-sm space-y-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
            {pullLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No logs yet.</p>
            ) : (
              pullLogs.map((log, index) => (
                <p key={index} style={{ color: 'var(--text-strong)' }}>
                  {log}
                </p>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setPullModalOpen(false)} disabled={pullRunning}>
              Close
            </Button>
            <Button type="button" onClick={handleForcePull} disabled={pullRunning || !isConfigured}>
              {pullRunning ? 'Pulling...' : 'Pull Again'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, title: '', payload: null })}
        title={detailModal.title || 'WordPress Item Details'}
        description="All recovered fields from WordPress payload"
        className="max-w-6xl"
      >
        <div className="space-y-3">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <pre
              className="rounded-xl border p-4 text-xs overflow-auto max-h-[60vh]"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)', color: 'var(--text-strong)' }}
            >
{JSON.stringify(detailModal.payload, null, 2)}
            </pre>

            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
              <p className="mb-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Featured Image
              </p>
              {detailFeaturedImageUrl ? (
                <a href={detailFeaturedImageUrl} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={detailFeaturedImageUrl}
                    alt="WordPress featured image"
                    className="h-auto w-full rounded-lg border object-cover"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </a>
              ) : (
                <div className="flex min-h-[180px] items-center justify-center rounded-lg border px-4 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  No featured image found in this payload.
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setDetailModal({ open: false, title: '', payload: null })}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
