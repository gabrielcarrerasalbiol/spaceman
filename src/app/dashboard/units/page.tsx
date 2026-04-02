'use client';

import { useEffect, useState } from 'react';
import { Box, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { usePermissions } from '@/hooks/usePermissions';

const EMPTY_UNIT = {
  locationId: '', code: '', name: '', type: '',
  sizeSqft: '', dimensions: '',
  weeklyRate: '', monthlyRate: '',
  status: 'AVAILABLE', is24hDriveUp: false, isIndoor: false,
};

interface LocationOption {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  code: string;
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_UNIT & { is24hDriveUp: boolean; isIndoor: boolean }>({ ...EMPTY_UNIT });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [search]);

  async function fetchLocations() {
    const response = await fetch('/api/locations');
    if (response.ok) {
      const data = await response.json();
      setLocations(data);
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

      const response = await fetch(`/api/units?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUnits(data);
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
    if (response.ok) fetchUnits();
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
          <div className="mb-4 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search units..." className="pl-10" />
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[var(--text-muted)]">Loading units...</p>
          ) : units.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <Box className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No units found.
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Weekly</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="font-medium">{unit.code}</div>
                        {unit.name && <div className="text-xs text-[var(--text-muted)]">{unit.name}</div>}
                      </TableCell>
                      <TableCell>{unit.location?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[unit.status] || 'secondary'}>{unit.status}</Badge>
                      </TableCell>
                      <TableCell>{unit.weeklyRate ? `£${unit.weeklyRate}` : '-'}</TableCell>
                      <TableCell>{unit._count?.contracts || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.location.href = `/dashboard/units/${unit.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteUnit(unit.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Input value={form.code} onChange={(e) => setField('code', e.target.value)} required placeholder="e.g. A-01" />
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
