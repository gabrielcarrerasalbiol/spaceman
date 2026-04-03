'use client';

import React, { useEffect, useState } from 'react';
import { Box, ChevronDown, ChevronRight, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { usePermissions } from '@/hooks/usePermissions';

const EMPTY_UNIT = {
  locationId: '', code: '', unitNumber: '', name: '', type: '',
  sizeSqft: '', dimensions: '',
  weeklyRate: '', monthlyRate: '',
  status: 'AVAILABLE', is24hDriveUp: false, isIndoor: false,
};

interface LocationOption {
  id: string;
  name: string;
}

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

function getWordPressUnitField(unit: any, ...keys: string[]) {
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

function renderWordPressValue(value: unknown) {
  if (isMissingValue(value)) return '-';
  return String(value);
}

function extractBaseCode(code: string): string {
  if (!code) return '';
  const parts = code.trim().split(/\s+/);
  return parts[0];
}

function groupUnitsByBaseCode(units: Unit[]): Map<string, Unit[]> {
  const grouped = new Map<string, Unit[]>();
  for (const unit of units) {
    const baseCode = extractBaseCode(unit.code);
    if (!grouped.has(baseCode)) {
      grouped.set(baseCode, []);
    }
    grouped.get(baseCode)!.push(unit);
  }
  return grouped;
}

interface Unit {
  id: string;
  code: string;
  unitNumber: number | null;
  name: string | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  weeklyRate: string | null;
  location: {
    name: string;
  };
  _count: {
    contracts: number;
  };
}

type WordPressMatchedUnitsMap = Record<string, any>;

interface UnitsApiPaginatedResponse {
  items: Unit[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  OCCUPIED: 'secondary',
  MAINTENANCE: 'danger',
  INACTIVE: 'secondary',
};

export default function UnitsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [matchedWordPressUnits, setMatchedWordPressUnits] = useState<WordPressMatchedUnitsMap>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_UNIT & { is24hDriveUp: boolean; isIndoor: boolean }>({ ...EMPTY_UNIT });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedBaseCodes, setExpandedBaseCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    fetchLocations();
    fetchWordPressMatches();
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [search, statusFilter, locationFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, locationFilter]);

  async function fetchLocations() {
    const response = await fetch('/api/locations');
    if (response.ok) {
      const data = await response.json();
      setLocations(data);
    }
  }

  async function fetchWordPressMatches() {
    try {
      const response = await fetch('/api/wordpress/pull', { cache: 'no-store' });
      if (!response.ok) return;

      const payload = await response.json();
      const wordpressUnits = Array.isArray(payload?.cache?.units) ? payload.cache.units : [];
      const nextMap = wordpressUnits.reduce((accumulator: WordPressMatchedUnitsMap, unit: any) => {
        const cmsId = unit?.__match?.cmsId;
        if (typeof cmsId === 'string' && cmsId.length > 0) {
          accumulator[cmsId] = unit;
        }
        return accumulator;
      }, {});

      setMatchedWordPressUnits(nextMap);
    } catch (error) {
      console.error('Failed to load WordPress matches:', error);
    }
  }

  function openModal() {
    setForm({ ...EMPTY_UNIT, locationId: locations[0]?.id || '' });
    setFormError(null);
    setModalOpen(true);
  }

  function setField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const response = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setModalOpen(false);
      fetchUnits();
    } else {
      const data = await response.json();
      setFormError(data.error || 'Failed to create unit');
    }
    setSaving(false);
  }

  async function fetchUnits() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (locationFilter !== 'ALL') params.set('locationId', locationFilter);
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));

      const response = await fetch(`/api/units?${params.toString()}`);
      if (response.ok) {
        const data: UnitsApiPaginatedResponse = await response.json();
        setUnits(data.items);
        setTotalItems(data.pagination.totalItems);
        setTotalPages(data.pagination.totalPages);

        if (data.pagination.page !== currentPage) {
          setCurrentPage(data.pagination.page);
        }
      }
    } catch (error) {
      console.error('Failed to load units:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUnit(id: string) {
    if (!window.confirm('Delete this unit? This cannot be undone.')) return;
    const response = await fetch(`/api/units/${id}`, { method: 'DELETE' });
    if (response.ok) {
      fetchUnits();
    }
  }

  function toggleBaseCode(baseCode: string) {
    setExpandedBaseCodes((prev) => {
      const next = new Set(prev);
      if (next.has(baseCode)) {
        next.delete(baseCode);
      } else {
        next.add(baseCode);
      }
      return next;
    });
  }

  function getBaseUnit(units: Unit[]): Unit | null {
    const base = units.find(u => !u.unitNumber);
    return base || units[0] || null;
  }

  function getChildUnits(units: Unit[]): Unit[] {
    if (units.length === 1) return [];
    const baseCode = extractBaseCode(units[0].code);
    return units.filter(u => extractBaseCode(u.code) === baseCode && u.id !== getBaseUnit(units)?.id);
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Units</h1>
          <p className="mt-2 text-[var(--text-muted)]">Track inventory and unit availability by location.</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Units</CardTitle>
          <CardDescription>Search units and review occupancy status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search units..." className="pl-10" />
            </div>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}
            >
              <option value="ALL">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}
            >
              <option value="ALL">All statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="OCCUPIED">OCCUPIED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setLocationFilter('ALL');
              }}
            >
              Clear
            </Button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[var(--text-muted)]">Loading units...</p>
          ) : units.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <Box className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No units found.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">&nbsp;</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Weekly</TableHead>
                      <TableHead>WP On Sale</TableHead>
                      <TableHead>WP Active</TableHead>
                      <TableHead>WP _Weekly Rate</TableHead>
                      <TableHead>WP Prorize ID</TableHead>
                      <TableHead>Contracts</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(groupUnitsByBaseCode(units).entries()).map(([baseCode, groupUnits]) => {
                      const baseUnit = getBaseUnit(groupUnits);
                      if (!baseUnit) return null;

                      const childUnits = getChildUnits(groupUnits);
                      const hasChildren = childUnits.length > 0;
                      const isExpanded = expandedBaseCodes.has(baseCode);

                      return (
                        <React.Fragment key={baseCode}>
                          {/* Base/Parent Row */}
                          <TableRow className={hasChildren ? 'bg-[var(--surface-1)]' : ''}>
                            <TableCell>
                              {hasChildren ? (
                                <button
                                  onClick={() => toggleBaseCode(baseCode)}
                                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--surface-2)] transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                                  )}
                                </button>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{baseUnit.code}</div>
                              {baseUnit.name && baseUnit.name !== baseUnit.code && (
                                <div className="text-xs text-[var(--text-muted)]">{baseUnit.name}</div>
                              )}
                              {hasChildren && (
                                <div className="text-xs text-[var(--text-muted)] mt-1">
                                  {childUnits.length} variant{childUnits.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{baseUnit.location?.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant[baseUnit.status] || 'secondary'}>{baseUnit.status}</Badge>
                            </TableCell>
                            <TableCell>{baseUnit.weeklyRate ? `£${baseUnit.weeklyRate}` : '-'}</TableCell>
                            <TableCell>
                              {matchedWordPressUnits[baseUnit.id] ? (
                                isTruthyFlag(getWordPressUnitField(matchedWordPressUnits[baseUnit.id], 'prorize_onsale')) ? (
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--success) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--success) 14%, var(--surface-0))', color: 'var(--success)' }}>YES</span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--danger) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface-0))', color: 'var(--danger)' }}>NO</span>
                                )
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {matchedWordPressUnits[baseUnit.id] ? (
                                isTruthyFlag(getWordPressUnitField(matchedWordPressUnits[baseUnit.id], 'active')) ? (
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--success) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--success) 14%, var(--surface-0))', color: 'var(--success)' }}>YES</span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--danger) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface-0))', color: 'var(--danger)' }}>NO</span>
                                )
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {matchedWordPressUnits[baseUnit.id] ? renderWordPressValue(getWordPressUnitField(matchedWordPressUnits[baseUnit.id], '_weekly_rate', 'weekly_rate')) : '-'}
                            </TableCell>
                            <TableCell>
                              {matchedWordPressUnits[baseUnit.id] ? renderWordPressValue(getWordPressUnitField(matchedWordPressUnits[baseUnit.id], 'prorize_id')) : '-'}
                            </TableCell>
                            <TableCell>{baseUnit._count?.contracts || 0}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => (window.location.href = `/dashboard/units/${baseUnit.id}/edit`)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => deleteUnit(baseUnit.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Child Rows - Collapsible */}
                          {isExpanded && childUnits.map((childUnit) => {
                            const matchedChildUnit = matchedWordPressUnits[childUnit.id] || null;
                            return (
                              <TableRow key={childUnit.id} className="bg-[var(--surface-0)]">
                                <TableCell> </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-30" />
                                    <div>
                                      <div className="font-medium text-sm">{childUnit.code}</div>
                                      {childUnit.name && childUnit.name !== childUnit.code && (
                                        <div className="text-xs text-[var(--text-muted)]">{childUnit.name}</div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-[var(--text-muted)]">{childUnit.location?.name || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant={statusVariant[childUnit.status] || 'secondary'} className="text-xs">{childUnit.status}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{childUnit.weeklyRate ? `£${childUnit.weeklyRate}` : '-'}</TableCell>
                                <TableCell>
                                  {matchedChildUnit ? (
                                    isTruthyFlag(getWordPressUnitField(matchedChildUnit, 'prorize_onsale')) ? (
                                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--success) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--success) 14%, var(--surface-0))', color: 'var(--success)' }}>YES</span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--danger) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface-0))', color: 'var(--danger)' }}>NO</span>
                                    )
                                  ) : '-'}
                                </TableCell>
                                <TableCell>
                                  {matchedChildUnit ? (
                                    isTruthyFlag(getWordPressUnitField(matchedChildUnit, 'active')) ? (
                                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--success) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--success) 14%, var(--surface-0))', color: 'var(--success)' }}>YES</span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--danger) 50%, var(--border))', backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface-0))', color: 'var(--danger)' }}>NO</span>
                                    )
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-sm text-[var(--text-muted)]">
                                  {matchedChildUnit ? renderWordPressValue(getWordPressUnitField(matchedChildUnit, '_weekly_rate', 'weekly_rate')) : '-'}
                                </TableCell>
                                <TableCell className="text-sm text-[var(--text-muted)]">
                                  {matchedChildUnit ? renderWordPressValue(getWordPressUnitField(matchedChildUnit, 'prorize_id')) : '-'}
                                </TableCell>
                                <TableCell className="text-sm text-[var(--text-muted)]">{childUnit._count?.contracts || 0}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => (window.location.href = `/dashboard/units/${childUnit.id}/edit`)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => deleteUnit(childUnit.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-muted)]">
                  Showing {units.length} of {totalItems} units
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage <= 1 || loading}
                  >
                    Previous
                  </Button>
                  <span className="min-w-[110px] text-center text-sm text-[var(--text-muted)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Unit" description="Create a new storage unit record." className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{formError}</div>}

          <div className="space-y-1">
            <label className="text-sm font-medium">Location <span className="text-[var(--danger)]">*</span></label>
            <select value={form.locationId} onChange={(e) => setField('locationId', e.target.value)} required
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
              <option value="">Select location</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Unit code <span className="text-[var(--danger)]">*</span></label>
              <Input value={form.code} onChange={(e) => setField('code', e.target.value)} required placeholder="e.g. 36Sqft 1" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Unit number</label>
              <Input type="number" min="1" value={String(form.unitNumber)} onChange={(e) => setField('unitNumber', e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Optional display name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <Input value={form.type} onChange={(e) => setField('type', e.target.value)} placeholder="e.g. Standard" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Size (sq ft)</label>
              <Input type="number" min="0" value={form.sizeSqft} onChange={(e) => setField('sizeSqft', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Dimensions</label>
              <Input value={form.dimensions} onChange={(e) => setField('dimensions', e.target.value)} placeholder="e.g. 10×10" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Weekly rate (£)</label>
              <Input type="number" min="0" step="0.01" value={form.weeklyRate} onChange={(e) => setField('weeklyRate', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Monthly rate (£)</label>
              <Input type="number" min="0" step="0.01" value={form.monthlyRate} onChange={(e) => setField('monthlyRate', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)}
                className="h-10 w-full rounded-xl border px-3 text-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RESERVED">RESERVED</option>
                <option value="OCCUPIED">OCCUPIED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isIndoor} onChange={(e) => setField('isIndoor', e.target.checked)} className="rounded" />
              Indoor
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is24hDriveUp} onChange={(e) => setField('is24hDriveUp', e.target.checked)} className="rounded" />
              24h drive-up
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Unit'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
