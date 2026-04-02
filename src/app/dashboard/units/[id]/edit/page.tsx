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

export default function EditUnitPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [form, setForm] = useState({
    locationId: '',
    code: '',
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
      const [locationsRes, unitRes] = await Promise.all([
        fetch('/api/locations'),
        fetch(`/api/units/${params.id as string}`),
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

      <Card className="max-w-4xl">
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
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-10 w-full rounded-xl border px-3 text-sm"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="space-y-2 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4" />
                  Active
                </label>
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
    </div>
  );
}
