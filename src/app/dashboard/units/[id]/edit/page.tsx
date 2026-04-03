'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';

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

export default function EditUnitPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [matchedWordPressUnit, setMatchedWordPressUnit] = useState<any | null>(null);
  const [form, setForm] = useState({
    locationId: '',
    code: '',
    unitNumber: '',
    name: '',
    type: '',
    sizeSqft: '',
    dimensions: '',
    weeklyRate: '',
    monthlyRate: '',
    salePrice: '',
    offer: '',
    status: 'AVAILABLE',
    active: true,
    is24hDriveUp: false,
    isIndoor: false,
  });

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) router.push('/dashboard');
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      bootstrap();
    }
  }, [isAdmin]);

  async function bootstrap() {
    try {
      const [locationsRes, unitRes, wordpressPullRes] = await Promise.all([
        fetch('/api/locations'),
        fetch(`/api/units/${params.id as string}`),
        fetch('/api/wordpress/pull', { cache: 'no-store' }),
      ]);

      if (locationsRes.ok) {
        setLocations(await locationsRes.json());
      }

      if (!unitRes.ok) {
        router.push('/dashboard/units');
        return;
      }

      const unit = await unitRes.json();
      setForm({
        locationId: unit.locationId || '',
        code: unit.code || '',
        unitNumber: unit.unitNumber?.toString() || '',
        name: unit.name || '',
        type: unit.type || '',
        sizeSqft: unit.sizeSqft?.toString() || '',
        dimensions: unit.dimensions || '',
        weeklyRate: unit.weeklyRate?.toString() || '',
        monthlyRate: unit.monthlyRate?.toString() || '',
        salePrice: unit.salePrice?.toString() || '',
        offer: unit.offer || '',
        status: unit.status || 'AVAILABLE',
        active: Boolean(unit.active),
        is24hDriveUp: Boolean(unit.is24hDriveUp),
        isIndoor: Boolean(unit.isIndoor),
      });

      if (wordpressPullRes.ok) {
        const wordpressPullPayload = await wordpressPullRes.json();
        const wordpressUnits = Array.isArray(wordpressPullPayload?.cache?.units)
          ? wordpressPullPayload.cache.units
          : [];
        const matched = wordpressUnits.find((wpUnit: any) => wpUnit?.__match?.cmsId === String(params.id));
        setMatchedWordPressUnit(matched || null);
      }
    } catch (e) {
      setError('Failed to load unit');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/units/${params.id as string}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Failed to update unit');
      } else {
        setSuccess('Unit updated successfully');
      }
    } catch (e) {
      setError('Failed to update unit');
    } finally {
      setSaving(false);
    }
  }

  if (permissionsLoading || loading || !isAdmin) {
    return <div className="min-h-[400px] flex items-center justify-center text-[var(--text-muted)]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/units">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Edit Unit</h1>
          <p className="mt-1 text-[var(--text-muted)]">Update inventory and pricing details.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit Details</CardTitle>
          <CardDescription>Changes here affect availability and contract assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}
            {success && <div className="rounded-xl border border-[var(--success)] p-3 text-sm text-[var(--success)]">{success}</div>}

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                className="h-10 rounded-xl border px-3 text-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              <Input placeholder="Unit number" value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} />
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <Input placeholder="Size sqft" value={form.sizeSqft} onChange={(e) => setForm({ ...form, sizeSqft: e.target.value })} />
              <Input placeholder="Dimensions" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} />
              <Input placeholder="Weekly rate" value={form.weeklyRate} onChange={(e) => setForm({ ...form, weeklyRate: e.target.value })} />
              <Input placeholder="Monthly rate" value={form.monthlyRate} onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })} />
              <Input placeholder="Sale price" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
            </div>

            <Input placeholder="Offer" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} />

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    setForm({
                      ...form,
                      status: nextStatus,
                      active: nextStatus !== 'INACTIVE',
                    });
                  }}
                  className="h-10 w-full rounded-xl border px-3 text-sm"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                >
                  <option value="AVAILABLE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="space-y-2 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isIndoor} onChange={(e) => setForm({ ...form, isIndoor: e.target.checked })} className="h-4 w-4" />
                  Indoor storage
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is24hDriveUp} onChange={(e) => setForm({ ...form, is24hDriveUp: e.target.checked })} className="h-4 w-4" />
                  24/7 Drive-Up
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Link href="/dashboard/units">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matched WordPress Data</CardTitle>
          <CardDescription>Read-only fields pulled from the linked WordPress unit.</CardDescription>
        </CardHeader>
        <CardContent>
          {matchedWordPressUnit ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Prorize On Sale</p>
                <div className="mt-2">
                  {isTruthyFlag(getWordPressUnitField(matchedWordPressUnit, 'prorize_onsale')) ? (
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
                </div>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Active</p>
                <div className="mt-2">
                  {isTruthyFlag(getWordPressUnitField(matchedWordPressUnit, 'active')) ? (
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
                </div>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>_Weekly Rate</p>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  {renderWordPressValue(getWordPressUnitField(matchedWordPressUnit, '_weekly_rate', 'weekly_rate'))}
                </p>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Prorize ID</p>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  {renderWordPressValue(getWordPressUnitField(matchedWordPressUnit, 'prorize_id'))}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No matched WordPress unit found for this CMS unit.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
