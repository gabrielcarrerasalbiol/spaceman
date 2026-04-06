'use client';

import { useEffect, useState } from 'react';
import { Edit, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { usePermissions } from '@/hooks/usePermissions';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'LEAD';
  _count: { contracts: number };
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  companyName: '',
  email: '',
  phone: '',
  billingEmail: '',
  addressLine1: '',
  addressLine2: '',
  townCity: '',
  county: '',
  postcode: '',
  country: '',
  notes: '',
  status: 'ACTIVE',
};

export default function ClientsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    fetchClients();
  }, [search]);

  async function fetchClients() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/clients?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setModalOpen(true);
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setModalOpen(false);
      fetchClients();
    } else {
      const data = await response.json();
      setFormError(data.error || 'Failed to create client');
    }
    setSaving(false);
  }

  async function deleteClient(id: string) {
    if (!window.confirm('Delete this client? This cannot be undone.')) return;
    const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (response.ok) fetchClients();
  }

  if (permissionsLoading || !isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Clients</h1>
          <p className="mt-2 text-[var(--text-muted)]">Store and manage customer records.</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Search and manage active customer accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="pl-10" />
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[var(--text-muted)]">Loading clients...</p>
          ) : clients.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <UserRound className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No clients found.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clients.map((client) => {
                const initials = `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`.toUpperCase();
                return (
                  <div
                    key={client.id}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-6 transition-all hover:shadow-lg hover:border-[var(--primary)]"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-xl font-semibold text-white shadow-md">
                        {initials || <UserRound className="h-8 w-8" />}
                      </div>
                      <Badge
                        variant={client.status === 'ACTIVE' ? 'success' : client.status === 'LEAD' ? 'warning' : 'secondary'}
                        className="text-xs"
                      >
                        {client.status}
                      </Badge>
                    </div>

                    <div className="mb-1">
                      <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                        {client.firstName} {client.lastName}
                      </h3>
                      {client.companyName && (
                        <p className="text-sm text-[var(--text-muted)]">{client.companyName}</p>
                      )}
                    </div>

                    <div className="mb-4 space-y-1 text-sm text-[var(--text-secondary)]">
                      {client.email && <p className="truncate">{client.email}</p>}
                      {client.phone && <p className="truncate">{client.phone}</p>}
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                      <div className="text-sm text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-strong)]">{client._count?.contracts || 0}</span> contracts
                      </div>
                      <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => (window.location.href = `/dashboard/clients/${client.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[var(--danger)] hover:text-[var(--danger)]"
                          onClick={() => deleteClient(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Client" description="Create a new customer profile." className="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-5">
          {formError && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{formError}</div>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">First name <span className="text-[var(--danger)]">*</span></label>
              <Input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Last name <span className="text-[var(--danger)]">*</span></label>
              <Input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Company name</label>
              <Input value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)}
                className="h-10 w-full rounded-xl border px-3 text-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="LEAD">LEAD</option>
              </select>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Contact</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <Input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Billing email</label>
              <Input type="email" value={form.billingEmail} onChange={(e) => setField('billingEmail', e.target.value)} />
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Address</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Address line 1</label>
              <Input value={form.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Address line 2</label>
              <Input value={form.addressLine2} onChange={(e) => setField('addressLine2', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Town / City</label>
              <Input value={form.townCity} onChange={(e) => setField('townCity', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">County</label>
              <Input value={form.county} onChange={(e) => setField('county', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Postcode</label>
              <Input value={form.postcode} onChange={(e) => setField('postcode', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Country</label>
              <Input value={form.country} onChange={(e) => setField('country', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={3}
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Client'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
