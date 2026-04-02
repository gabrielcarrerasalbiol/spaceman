'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    billingEmail: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) router.push('/dashboard');
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchClient();
    }
  }, [isAdmin]);

  async function fetchClient() {
    try {
      const response = await fetch(`/api/clients/${params.id as string}`);
      if (!response.ok) {
        router.push('/dashboard/clients');
        return;
      }
      const client = await response.json();
      setForm({
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        companyName: client.companyName || '',
        email: client.email || '',
        phone: client.phone || '',
        billingEmail: client.billingEmail || '',
        status: client.status || 'ACTIVE',
      });
    } catch (e) {
      setError('Failed to load client');
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
      const response = await fetch(`/api/clients/${params.id as string}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Failed to update client');
      } else {
        setSuccess('Client updated successfully');
      }
    } catch (e) {
      setError('Failed to update client');
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
        <Link href="/dashboard/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Edit Client</h1>
          <p className="mt-1 text-[var(--text-muted)]">Update customer details and account status.</p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>Keep contract and contact records up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}
            {success && <div className="rounded-xl border border-[var(--success)] p-3 text-sm text-[var(--success)]">{success}</div>}

            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Input placeholder="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Billing email" value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} />
            </div>

            <div className="max-w-xs">
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-10 w-full rounded-xl border px-3 text-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="LEAD">LEAD</option>
              </select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Link href="/dashboard/clients">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
