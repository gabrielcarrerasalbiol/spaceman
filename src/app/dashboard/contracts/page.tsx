'use client';

import { useEffect, useState } from 'react';
import { Edit, FileSignature, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { usePermissions } from '@/hooks/usePermissions';
import { formatUnitDisplayName, formatUnitSizeLabel } from '@/lib/unit-display';

interface Contract {
  id: string;
  contractNumber: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  depositAmount: number | null;
  paymentMethod: string | null;
  notes: string | null;
  signedAt: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  unit: {
    id: string;
    code: string;
    sizeSqft: number | null;
    unitNumber: number | null;
  };
  location: {
    id: string;
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
  sizeSqft: number | null;
  unitNumber: number | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  weeklyRate?: string | null;
  monthlyRate?: string | null;
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
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [unitSize, setUnitSize] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE'>('DRAFT');

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
    setUnitSize('');
    setStartDate('');
    setEndDate('');
    setWeeklyRate('');
    setMonthlyRate('');
    setDepositAmount('');
    setBillingDay('');
    setNotes('');
    setStatus('DRAFT');
    setFormError(null);
    setModalOpen(true);
  }

  const filteredUnits = units.filter((unit) => unit.locationId === locationId && unit.status === 'AVAILABLE');
  const availableSizes = [...new Set(filteredUnits.map((unit) => unit.sizeSqft).filter((value) => value !== null))]
    .sort((left, right) => Number(left) - Number(right));
  const selectableUnits = filteredUnits.filter((unit) => String(unit.sizeSqft ?? '') === unitSize);

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
        status,
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
    <div className="space-y-6 pt-6">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contract List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>All Contracts</CardTitle>
            <CardDescription>Search and select a contract to view details.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts..." className="pl-10" />
              </div>
            </div>

            {loading ? (
              <p className="py-8 px-6 text-center text-[var(--text-muted)]">Loading contracts...</p>
            ) : contracts.length === 0 ? (
              <div className="py-8 px-6 text-center text-[var(--text-muted)]">
                <FileSignature className="mx-auto mb-3 h-10 w-10 opacity-50" />
                No contracts found.
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {contracts.map((contract) => {
                  const isSelected = selectedContractId === contract.id;
                  return (
                    <div
                      key={contract.id}
                      onClick={() => setSelectedContractId(contract.id)}
                      className={`flex cursor-pointer items-center gap-3 border-b border-[var(--border)] p-4 transition-all hover:bg-gray-50 ${
                        isSelected ? 'bg-red-50 border-l-4 border-l-red-200' : ''
                      }`}
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-sm font-semibold text-white">
                        <FileSignature className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[var(--text-strong)] truncate">
                          {contract.contractNumber}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          {contract.client?.firstName} {contract.client?.lastName}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant={statusVariant[contract.status] || 'secondary'}
                            className="text-xs"
                          >
                            {contract.status}
                          </Badge>
                          <span className="text-xs text-[var(--text-muted)]">{contract.unit?.code}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Detail Panel */}
        <Card className="lg:col-span-2 bg-gray-50 border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <CardTitle>Contract Details</CardTitle>
            <CardDescription>View and manage selected contract information.</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedContractId ? (
              <div className="flex h-[400px] items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                  <FileSignature className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>Select a contract from the list to view their details</p>
                </div>
              </div>
            ) : (
              (() => {
                const contract = contracts.find((c) => c.id === selectedContractId);
                if (!contract) return null;
                return (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-[var(--text-strong)]">
                          {contract.contractNumber}
                        </h2>
                        <div className="mt-2 flex items-center gap-3">
                          <Badge variant={statusVariant[contract.status] || 'secondary'}>
                            {contract.status}
                          </Badge>
                          <span className="text-sm text-[var(--text-muted)]">
                            Created: {new Date(contract.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => (window.location.href = `/dashboard/contracts/${contract.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="outline" className="text-[var(--danger)]" onClick={() => deleteContract(contract.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Client Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">Client Information</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Name</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">
                            {contract.client?.firstName} {contract.client?.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Email</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">{contract.client?.email || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Phone</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">{contract.client?.phone || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Unit & Location Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">Unit & Location</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Unit</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">{contract.unit?.code || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Location</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">{contract.location?.name || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Size</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">
                            {contract.unit?.sizeSqft ? `${contract.unit.sizeSqft} sq ft` : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Unit Number</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">{contract.unit?.unitNumber || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contract Dates */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">Contract Dates</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Start Date</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">
                            {new Date(contract.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">End Date</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">
                            {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Ongoing'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Financial Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">Financial Information</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Weekly Rate</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">
                            {contract.weeklyRate ? `£${contract.weeklyRate}` : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Monthly Rate</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">
                            {contract.monthlyRate ? `£${contract.monthlyRate}` : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Deposit</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">
                            {contract.depositAmount ? `£${contract.depositAmount}` : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Payment Method</label>
                          <p className="mt-1 text-sm text-[var(--text-strong)]">{contract.paymentMethod || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {contract.notes && (
                      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold text-[var(--text-strong)]">Notes</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{contract.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
                      <Button variant="outline" onClick={() => setSelectedContractId(null)}>
                        Close
                      </Button>
                      <Button onClick={() => (window.location.href = `/dashboard/contracts/${contract.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Contract
                      </Button>
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>

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
            <label className="text-sm font-medium">Location <span className="text-[var(--danger)]">*</span></label>
            <select value={locationId} onChange={(e) => {
              setLocationId(e.target.value);
              setUnitSize('');
              setUnitId('');
            }} required
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
              <option value="">Select location</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Unit size <span className="text-[var(--danger)]">*</span></label>
            <select value={unitSize} onChange={(e) => {
              setUnitSize(e.target.value);
              setUnitId('');
            }} required
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
              <option value="">Select unit size</option>
              {availableSizes.map((size) => <option key={size} value={String(size)}>{formatUnitSizeLabel(size)}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Unit number <span className="text-[var(--danger)]">*</span></label>
            <select value={unitId} onChange={(e) => {
              setUnitId(e.target.value);
              const selectedUnit = selectableUnits.find((unit) => unit.id === e.target.value);
              if (selectedUnit) {
                if (!weeklyRate && selectedUnit.weeklyRate) setWeeklyRate(String(selectedUnit.weeklyRate));
                if (!monthlyRate && selectedUnit.monthlyRate) setMonthlyRate(String(selectedUnit.monthlyRate));
              }
            }} required
              className="h-10 w-full rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
              <option value="">Select unit number</option>
              {selectableUnits.map((unit) => <option key={unit.id} value={unit.id}>{formatUnitDisplayName(unit)}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Contract status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE')}
                className="h-10 w-full rounded-xl border px-3 text-sm"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)', color: 'var(--text-strong)' }}>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_SIGNATURE">PENDING_SIGNATURE</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
            </div>
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
