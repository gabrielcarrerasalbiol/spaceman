'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Layers3, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatUnitDisplayName, formatUnitSizeLabel, normalizeSizeSqft } from '@/lib/unit-display';
import { useSettings } from '@/contexts/SettingsContext';
import { getStatusColor, getStatusLabel } from '@/lib/status-config';

type UnitInventoryItem = {
  id: string;
  code: string;
  unitNumber: number | null;
  sizeSqft: number | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  _count?: {
    contracts: number;
  };
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
  const { settings } = useSettings();
  const [units, setUnits] = useState<UnitInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isBulkSetupOpen, setIsBulkSetupOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_BULK_FORM });
  const [sizeSelection, setSizeSelection] = useState<'custom' | string>('custom');

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

  const existingSizeOptions = useMemo(() => {
    return groupedInventory
      .map((group) => normalizeSizeSqft(group.sizeSqft))
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right);
  }, [groupedInventory]);

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

      const created = Number(payload.createdCount || 0);
      const removed = Number(payload.removedCount || 0);
      setSuccess(`Inventory updated for ${formatUnitSizeLabel(form.sizeSqft)}. Created ${created}, removed ${removed}.`);
      setForm({ ...EMPTY_BULK_FORM });
      setSizeSelection('custom');
      await fetchUnits();
    } catch (caughtError) {
      console.error('Failed to create units:', caughtError);
      setError('Failed to create units');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveUnit(unitId: string, unitLabel: string, linkedContracts = 0) {
    if (linkedContracts > 0) {
      setError(`${unitLabel} is linked to ${linkedContracts} contract(s) and cannot be removed.`);
      return;
    }

    const proceed = window.confirm(`Remove ${unitLabel}? This cannot be undone.`);
    if (!proceed) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/units/${unitId}`, { method: 'DELETE' });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Failed to remove unit');
        return;
      }

      setSuccess(`${unitLabel} removed.`);
      await fetchUnits();
    } catch (caughtError) {
      console.error('Failed to remove unit:', caughtError);
      setError('Failed to remove unit');
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Bulk Unit Setup</CardTitle>
              <CardDescription>Define the total number of units for each size at this location. Missing numbered units are created automatically.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkSetupOpen((current) => !current)}
            >
              {isBulkSetupOpen ? (
                <>
                  Collapse
                  <ChevronUp className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Expand
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {isBulkSetupOpen && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}
            {success && <div className="rounded-xl border border-[var(--success)] p-3 text-sm text-[var(--success)]">{success}</div>}

            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">Unit size</label>
                  <select
                    value={sizeSelection}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSizeSelection(next);
                      if (next === 'custom') {
                        setForm({ ...form, sizeSqft: '' });
                        return;
                      }
                      setForm({ ...form, sizeSqft: next });
                    }}
                    className="h-10 w-full rounded-xl border px-3 text-sm"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                  >
                    <option value="custom">Custom size...</option>
                    {existingSizeOptions.map((size) => (
                      <option key={size} value={String(size)}>{formatUnitSizeLabel(size)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">Size sqft</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Size sqft"
                    value={form.sizeSqft}
                    onChange={(event) => setForm({ ...form, sizeSqft: event.target.value })}
                    required
                    disabled={sizeSelection !== 'custom'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">Total quantity</label>
                  <Input type="number" min="1" placeholder="Total quantity" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} />
                <Input placeholder="Dimensions" value={form.dimensions} onChange={(event) => setForm({ ...form, dimensions: event.target.value })} />
                <Input type="number" min="0" step="0.01" placeholder="Weekly rate" value={form.weeklyRate} onChange={(event) => setForm({ ...form, weeklyRate: event.target.value })} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input type="number" min="0" step="0.01" placeholder="Monthly rate" value={form.monthlyRate} onChange={(event) => setForm({ ...form, monthlyRate: event.target.value })} />
                <Input type="number" min="0" step="0.01" placeholder="Sale price" value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} />
                <Input placeholder="Offer / label" value={form.offer} onChange={(event) => setForm({ ...form, offer: event.target.value })} />
              </div>
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
        )}
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
                        <p className="text-sm text-[var(--text-muted)]">
                          Total {total} · {getStatusLabel(settings.unitStatusConfig, 'AVAILABLE')} {available} · {getStatusLabel(settings.unitStatusConfig, 'RESERVED')} {reserved} · {getStatusLabel(settings.unitStatusConfig, 'OCCUPIED')} {occupied}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span key={item.id} className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
                          {formatUnitDisplayName(item)}
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              color: getStatusColor(settings.unitStatusConfig, item.status),
                              backgroundColor: `color-mix(in srgb, ${getStatusColor(settings.unitStatusConfig, item.status)} 16%, var(--surface-0))`,
                            }}
                          >
                            {getStatusLabel(settings.unitStatusConfig, item.status)}
                          </span>
                          {item._count?.contracts ? (
                            <span className="text-xs text-[var(--text-muted)]">linked ({item._count.contracts})</span>
                          ) : (
                            <button
                              type="button"
                              className="rounded p-0.5 text-[var(--danger)] transition hover:bg-[var(--surface-1)]"
                              onClick={() => handleRemoveUnit(item.id, formatUnitDisplayName(item), item._count?.contracts || 0)}
                              aria-label={`Remove ${formatUnitDisplayName(item)}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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