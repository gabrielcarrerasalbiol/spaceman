'use client';

import { useEffect, useState } from 'react';
import { Edit, FileSignature, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { usePermissions } from '@/hooks/usePermissions';

interface Contract {
  id: string;
  contractNumber: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  client: {
    firstName: string;
    lastName: string;
  };
  unit: {
    code: string;
  };
  location: {
    name: string;
  };
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface UnitOption {
  id: string;
  code: string;
  locationId: string;
}

interface LocationOption {
  id: string;
  name: string;
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
  DRAFT: 'secondary',
  PENDING_SIGNATURE: 'warning',
  ACTIVE: 'success',
  TERMINATED: 'danger',
  EXPIRED: 'secondary',
  CANCELLED: 'danger',
};

export default function ContractsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [search]);

  async function bootstrap() {
    const [clientsRes, unitsRes, locationsRes] = await Promise.all([
      fetch('/api/clients'),
      fetch('/api/units'),
      fetch('/api/locations'),
    ]);

    if (clientsRes.ok) setClients(await clientsRes.json());
    if (unitsRes.ok) setUnits(await unitsRes.json());
    if (locationsRes.ok) setLocations(await locationsRes.json());
  }

  function openModal() {
    setClientId('');
    setUnitId('');
    setLocationId('');
    setStartDate('');
    setEndDate('');
    setWeeklyRate('');
    setMonthlyRate('');
    setDepositAmount('');
    setBillingDay('');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  }

  async function fetchContracts() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/contracts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setContracts(data);
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const response = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId, unitId, locationId, startDate,
        endDate: endDate || null,
        weeklyRate: weeklyRate || null,
        monthlyRate: monthlyRate || null,
        depositAmount: depositAmount || null,
        billingDay: billingDay ? Number(billingDay) : null,
        notes: notes || null,
      }),
    });
    if (response.ok) {
      setModalOpen(false);
      fetchContracts();
    } else {
      const data = await response.json();
      setFormError(data.error || 'Failed to create contract');
    }
    setSaving(false);
  }

  async function deleteContract(id: string) {
    if (!window.confirm('Delete this contract? This cannot be undone.')) return;
    const response = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
    if (response.ok) fetchContracts();
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Contracts</h1>
          <p className="mt-2 text-[var(--text-muted)]">Manage unit reservations and customer contracts.</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contract
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
          <CardDescription>Track status and linked records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts..." className="pl-10" />
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[var(--text-muted)]">Loading contracts...</p>
          ) : contracts.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <FileSignature className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No contracts found.
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="font-medium">{contract.contractNumber}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {new Date(contract.startDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{contract.client?.firstName} {contract.client?.lastName}</TableCell>
                      <TableCell>{contract.unit?.code || '-'}</TableCell>
                      <TableCell>{contract.location?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[contract.status] || 'secondary'}>{contract.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.location.href = `/dashboard/contracts/${contract.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteContract(contract.id)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Contract" description="Link a client and unit to start a new contract." className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{formError}</div>}

          <div className="space-y-1">
            <label className="text-sm font-medium">Client <span className="text-[var(--danger)]">*</span></label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Unit <span className="text-[var(--danger)]">*</span></label>
            <select value={unitId} onChange={(e) => {
              setUnitId(e.target.value);
              const u = units.find((u) => u.id === e.target.value);
              if (u) setLocationId(u.locationId);
            }} required
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
              <option value="">Select unit</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Location <span className="text-[var(--danger)]">*</span></label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
              <option value="">Select location</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start date <span className="text-[var(--danger)]">*</span></label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Weekly rate (£)</label>
              <Input type="number" min="0" step="0.01" value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Monthly rate (£)</label>
              <Input type="number" min="0" step="0.01" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Deposit (£)</label>
              <Input type="number" min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Billing day</label>
              <Input type="number" min="1" max="31" value={billingDay} onChange={(e) => setBillingDay(e.target.value)} placeholder="1–31" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Contract'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
