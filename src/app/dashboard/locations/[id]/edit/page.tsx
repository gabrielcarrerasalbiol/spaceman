'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { LocationUnitSetup } from '@/components/location-unit-setup';

const LocationAreaEditor = dynamic(() => import('@/components/location-area-editor'), {
  ssr: false,
  loading: () => <p className="text-[var(--text-muted)]">Loading area editor...</p>,
});

export default function EditLocationPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    addressLine1: '',
    addressLine2: '',
    townCity: '',
    county: '',
    postcode: '',
    email: '',
    phone: '',
    openingHours: '',
    latitude: '',
    longitude: '',
    active: true,
  });

  const locationLabel = form.name.trim() || 'Unnamed location';

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) router.push('/dashboard');
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchLocation();
    }
  }, [isAdmin]);

  async function fetchLocation() {
    try {
      const response = await fetch(`/api/locations/${params.id as string}`);
      if (!response.ok) {
        router.push('/dashboard/locations');
        return;
      }

      const location = await response.json();
      setForm({
        name: location.name || '',
        code: location.code || '',
        addressLine1: location.addressLine1 || '',
        addressLine2: location.addressLine2 || '',
        townCity: location.townCity || '',
        county: location.county || '',
        postcode: location.postcode || '',
        email: location.email || '',
        phone: location.phone || '',
        openingHours: location.openingHours || '',
        latitude: location.latitude?.toString() || '',
        longitude: location.longitude?.toString() || '',
        active: Boolean(location.active),
      });
    } catch (e) {
      setError('Failed to load location');
    } finally {
      setLoading(false);
    }
  }

  async function handleGeocode() {
    const query = [form.addressLine1, form.townCity, form.postcode].filter(Boolean).join(', ');
    if (!query) return;

    try {
      setGeocoding(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return;

      setForm((prev) => ({
        ...prev,
        latitude: String(data[0].lat),
        longitude: String(data[0].lon),
      }));
    } catch (e) {
      console.error('Geocode failed:', e);
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/locations/${params.id as string}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Failed to update location');
      } else {
        setSuccess('Location updated successfully');
      }
    } catch (e) {
      setError('Failed to update location');
    } finally {
      setSaving(false);
    }
  }

  if (permissionsLoading || loading || !isAdmin) {
    return <div className="min-h-[400px] flex items-center justify-center text-[var(--text-muted)]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/locations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-strong)]">Edit Location: {locationLabel}</h1>
            <p className="mt-1 text-[var(--text-muted)]">Update branch details and contact info for this location.</p>
          </div>
        </div>
        <Badge className="text-sm px-3 py-1.5" variant="default">{locationLabel}</Badge>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="areas">Areas</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Location Details</CardTitle>
              <CardDescription>These values are used in listings and contract linking.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}
                {success && <div className="rounded-xl border border-[var(--success)] p-3 text-sm text-[var(--success)]">{success}</div>}

                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Location name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  <Input placeholder="Address line 1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
                  <Input placeholder="Address line 2" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
                  <Input placeholder="Town/City" value={form.townCity} onChange={(e) => setForm({ ...form, townCity: e.target.value })} />
                  <Input placeholder="County" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
                  <Input placeholder="Postcode" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
                  <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="Opening hours" value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} />
                  <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                  <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                </div>

                <div>
                  <Button type="button" variant="outline" onClick={handleGeocode} disabled={geocoding}>
                    {geocoding ? 'Geocoding...' : 'Geocode'}
                  </Button>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Active location
                </label>

                <div className="flex gap-3">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Link href="/dashboard/locations">
                    <Button type="button" variant="outline">Cancel</Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <LocationUnitSetup locationId={params.id as string} />
        </TabsContent>

        <TabsContent value="areas">
          <LocationAreaEditor locationId={params.id as string} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
