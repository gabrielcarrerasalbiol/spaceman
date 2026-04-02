'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layers3, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatUnitDisplayName, formatUnitSizeLabel, normalizeSizeSqft } from '@/lib/unit-display';

type UnitInventoryItem = {
  id: string;
  code: string;
  unitNumber: number | null;
  sizeSqft: number | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
};

const EMPTY_BULK_FORM = {
  sizeSqft: '',
  quantity: '',
  type: '',
  dimensions: '',
  weeklyRate: '',
  monthlyRate: '',
  salePrice: '',
  offer: '',
  isIndoor: false,
  is24hDriveUp: false,
  description: '',
};

export function LocationUnitSetup({ locationId }: { locationId: string }) {
  const [units, setUnits] = useState<UnitInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_BULK_FORM });

  useEffect(() => {
    void fetchUnits();
  }, [locationId]);

  const groupedInventory = useMemo(() => {
    const groups = new Map<number | null, UnitInventoryItem[]>();
    for (const unit of units) {
      const key = normalizeSizeSqft(unit.sizeSqft);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(unit);
    }

    return [...groups.entries()]
      .sort((a, b) => (a[0] ?? Number.MAX_SAFE_INTEGER) - (b[0] ?? Number.MAX_SAFE_INTEGER))
      .map(([sizeSqft, items]) => ({
        sizeSqft,
        label: formatUnitSizeLabel(sizeSqft),
        items: [...items].sort((left, right) => {
          const leftNumber = left.unitNumber ?? Number.MAX_SAFE_INTEGER;
          const rightNumber = right.unitNumber ?? Number.MAX_SAFE_INTEGER;
          if (leftNumber !== rightNumber) return leftNumber - rightNumber;
          return left.code.localeCompare(right.code);
        }),
      }));
  }, [units]);

  async function fetchUnits() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/units?locationId=${encodeURIComponent(locationId)}`);
      if (!response.ok) {
        setError('Failed to load location inventory');
        return;
      }
      setUnits(await response.json());
    } catch (caughtError) {
      console.error('Failed to load units:', caughtError);
      setError('Failed to load location inventory');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/locations/${locationId}/bulk-units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Failed to create units');
        return;
      }

      setSuccess(`Inventory updated for ${formatUnitSizeLabel(form.sizeSqft)}. ${payload.createdCount} unit(s) created.`);
      setForm({ ...EMPTY_BULK_FORM });
      await fetchUnits();
    } catch (caughtError) {
      console.error('Failed to create units:', caughtError);
      setError('Failed to create units');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Unit Setup</CardTitle>
          <CardDescription>Define the total number of units for each size at this location. Missing numbered units are created automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}
            {success && <div className="rounded-xl border border-[var(--success)] p-3 text-sm text-[var(--success)]">{success}</div>}

            <div className="grid gap-3 md:grid-cols-3">
              <Input type="number" min="1" placeholder="Size sqft" value={form.sizeSqft} onChange={(event) => setForm({ ...form, sizeSqft: event.target.value })} required />
              <Input type="number" min="1" placeholder="Total quantity" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
              <Input placeholder="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} />
              <Input placeholder="Dimensions" value={form.dimensions} onChange={(event) => setForm({ ...form, dimensions: event.target.value })} />
              <Input type="number" min="0" step="0.01" placeholder="Weekly rate" value={form.weeklyRate} onChange={(event) => setForm({ ...form, weeklyRate: event.target.value })} />
              <Input type="number" min="0" step="0.01" placeholder="Monthly rate" value={form.monthlyRate} onChange={(event) => setForm({ ...form, monthlyRate: event.target.value })} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input type="number" min="0" step="0.01" placeholder="Sale price" value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} />
              <Input placeholder="Offer / label" value={form.offer} onChange={(event) => setForm({ ...form, offer: event.target.value })} />
            </div>

            <Input placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isIndoor} onChange={(event) => setForm({ ...form, isIndoor: event.target.checked })} className="rounded" />
                Indoor
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is24hDriveUp} onChange={(event) => setForm({ ...form, is24hDriveUp: event.target.checked })} className="rounded" />
                24h drive-up
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Plus className="mr-2 h-4 w-4" />
                {saving ? 'Creating...' : 'Apply Inventory Setup'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <CardDescription>Units are grouped by size and numbered per location.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-[var(--text-muted)]">Loading inventory...</p>
          ) : groupedInventory.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <Layers3 className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No units configured for this location.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedInventory.map((group) => {
                const total = group.items.length;
                const available = group.items.filter((item) => item.status === 'AVAILABLE').length;
                const reserved = group.items.filter((item) => item.status === 'RESERVED').length;
                const occupied = group.items.filter((item) => item.status === 'OCCUPIED').length;

                return (
                  <div key={group.label} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--text-strong)]">{group.label}</p>
                        <p className="text-sm text-[var(--text-muted)]">Total {total} · Available {available} · Reserved {reserved} · Occupied {occupied}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span key={item.id} className="rounded-lg border px-2.5 py-1 text-sm"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
                          {formatUnitDisplayName(item)} <span className="text-[var(--text-muted)]">· {item.status}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}