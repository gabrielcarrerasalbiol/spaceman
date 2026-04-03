'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Globe, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
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
  const [wordpressFilling, setWordpressFilling] = useState(false);
  const [wordpressPreviewOpen, setWordpressPreviewOpen] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [wordpressPreview, setWordpressPreview] = useState<{
    matchedBy: string;
    wordpressTitle: string;
    mappedFields: Partial<Record<WordPressFillKey, string>>;
  } | null>(null);
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

  const WORDPRESS_FILL_FIELDS: Array<{ key: WordPressFillKey; label: string }> = [
    { key: 'addressLine1', label: 'Address line 1' },
    { key: 'addressLine2', label: 'Address line 2' },
    { key: 'townCity', label: 'Town/City' },
    { key: 'county', label: 'County' },
    { key: 'postcode', label: 'Postcode' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'openingHours', label: 'Opening hours' },
    { key: 'latitude', label: 'Latitude' },
    { key: 'longitude', label: 'Longitude' },
  ];

  const previewRows = wordpressPreview
    ? WORDPRESS_FILL_FIELDS
        .map(({ key, label }) => {
          const incomingValue = String(wordpressPreview.mappedFields[key] ?? '').trim();
          if (!incomingValue) return null;

          const currentValue = String(form[key] ?? '').trim();
          const willApply = !currentValue || overwriteExisting;

          return {
            key,
            label,
            currentValue,
            incomingValue,
            willApply,
            reason: currentValue ? (overwriteExisting ? 'overwrite' : 'kept') : 'fill',
          };
        })
        .filter((row): row is {
          key: WordPressFillKey;
          label: string;
          currentValue: string;
          incomingValue: string;
          willApply: boolean;
          reason: 'overwrite' | 'kept' | 'fill';
        } => row !== null)
    : [];

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
    if (!query) {
      setError('Enter address details before geocoding.');
      return;
    }

    try {
      setGeocoding(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Failed to geocode address');
        return;
      }

      setForm((prev) => ({
        ...prev,
        latitude: String(data.lat),
        longitude: String(data.lon),
      }));
      setSuccess('Coordinates updated from address. Save changes to persist.');
    } catch (e) {
      console.error('Geocode failed:', e);
      setError('Failed to geocode address');
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

  async function handleFillFromWordPress() {
    try {
      setWordpressFilling(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/wordpress/location-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: params.id as string }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || 'Failed to fetch location data from WordPress.');
        return;
      }

      const mapped = (payload?.mappedFields && typeof payload.mappedFields === 'object') ? payload.mappedFields : {};
      const nextMapped: Partial<Record<WordPressFillKey, string>> = {};
      for (const { key } of WORDPRESS_FILL_FIELDS) {
        nextMapped[key] = String((mapped as Record<string, unknown>)[key] ?? '').trim();
      }

      setWordpressPreview({
        matchedBy: String(payload?.matchedBy || 'matched'),
        wordpressTitle: String(payload?.wordpressTitle || payload?.wordpressId || 'WordPress location'),
        mappedFields: nextMapped,
      });
      setOverwriteExisting(false);
      setWordpressPreviewOpen(true);
    } catch (e) {
      console.error('WordPress fill failed:', e);
      setError('Failed to fetch location data from WordPress.');
    } finally {
      setWordpressFilling(false);
    }
  }

  function applyWordPressPreview() {
    if (!wordpressPreview) return;

    let appliedCount = 0;
    setForm((prev) => {
      const next = { ...prev };

      for (const { key } of WORDPRESS_FILL_FIELDS) {
        const incomingValue = String(wordpressPreview.mappedFields[key] ?? '').trim();
        if (!incomingValue) continue;

        const currentValue = String(prev[key] ?? '').trim();
        if (!currentValue || overwriteExisting) {
          next[key] = incomingValue as any;
          appliedCount += 1;
        }
      }

      return next;
    });

    setWordpressPreviewOpen(false);
    if (appliedCount > 0) {
      setSuccess(`Applied ${appliedCount} field${appliedCount > 1 ? 's' : ''} from WordPress (${wordpressPreview.matchedBy}). Save changes to persist.`);
    } else {
      setSuccess('No fields were applied from WordPress with current overwrite settings.');
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
          <Card>
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
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={handleGeocode} disabled={geocoding}>
                      {geocoding ? 'Geocoding...' : 'Geocode'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleFillFromWordPress} disabled={wordpressFilling}>
                      <Globe className="h-4 w-4 mr-2" />
                      {wordpressFilling ? 'Loading from WordPress...' : 'Fill Missing from WordPress'}
                    </Button>
                  </div>
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

      <Modal
        open={wordpressPreviewOpen}
        onClose={() => setWordpressPreviewOpen(false)}
        title="Review WordPress Data Match"
        description="Confirm which fields should be copied into this location form"
        className="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
            <p style={{ color: 'var(--text-strong)' }}>
              Source: <strong>{wordpressPreview?.wordpressTitle || '-'}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              Matched by: {wordpressPreview?.matchedBy || '-'}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="h-4 w-4"
            />
            Overwrite existing form values (if unchecked, only empty fields are filled)
          </label>

          <div className="max-h-[50vh] overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--surface-1)' }}>
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="px-3 py-2 text-left">Current</th>
                  <th className="px-3 py-2 text-left">WordPress</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-[var(--text-muted)]" colSpan={4}>No usable fields were found in the WordPress payload.</td>
                  </tr>
                ) : (
                  previewRows.map((row) => (
                    <tr key={row.key} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-2 font-medium">{row.label}</td>
                      <td className="px-3 py-2">{row.currentValue || <span className="text-[var(--text-muted)]">(empty)</span>}</td>
                      <td className="px-3 py-2">{row.incomingValue}</td>
                      <td className="px-3 py-2">
                        {row.reason === 'fill' && <span className="text-[var(--success)]">Fill missing</span>}
                        {row.reason === 'overwrite' && <span className="text-[var(--warning)]">Overwrite</span>}
                        {row.reason === 'kept' && <span className="text-[var(--text-muted)]">Keep current</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setWordpressPreviewOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyWordPressPreview}>
              Apply to Form
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type WordPressFillKey =
  | 'addressLine1'
  | 'addressLine2'
  | 'townCity'
  | 'county'
  | 'postcode'
  | 'email'
  | 'phone'
  | 'openingHours'
  | 'latitude'
  | 'longitude';
