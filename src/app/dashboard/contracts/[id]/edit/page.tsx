'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';
import { formatUnitDisplayName, formatUnitSizeLabel } from '@/lib/unit-display';

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
}

interface LocationOption {
  id: string;
  name: string;
}

export default function EditContractPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [unitSize, setUnitSize] = useState('');

  const [form, setForm] = useState({
    contractNumber: '',
    clientId: '',
    unitId: '',
    locationId: '',
    startDate: '',
    endDate: '',
    paymentMethod: '',
    weeklyRate: '',
    monthlyRate: '',
    depositAmount: '',
    status: 'DRAFT',
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
      const [clientsRes, unitsRes, locationsRes, contractRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/units'),
        fetch('/api/locations'),
        fetch(`/api/contracts/${params.id as string}`),
      ]);

      if (!contractRes.ok) {
        router.push('/dashboard/contracts');
        return;
      }

      if (clientsRes.ok) setClients(await clientsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (locationsRes.ok) setLocations(await locationsRes.json());

      const contract = await contractRes.json();
      const unitSizeValue = contract.unit?.sizeSqft !== null && contract.unit?.sizeSqft !== undefined ? String(contract.unit.sizeSqft) : '';
      setForm({
        contractNumber: contract.contractNumber || '',
        clientId: contract.clientId || '',
        unitId: contract.unitId || '',
        locationId: contract.locationId || '',
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().slice(0, 10) : '',
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 10) : '',
        paymentMethod: contract.paymentMethod || '',
        weeklyRate: contract.weeklyRate?.toString() || '',
        monthlyRate: contract.monthlyRate?.toString() || '',
        depositAmount: contract.depositAmount?.toString() || '',
        status: contract.status || 'DRAFT',
      });
      setUnitSize(unitSizeValue);
    } catch (e) {
      setError('Failed to load contract');
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
      const response = await fetch(`/api/contracts/${params.id as string}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Failed to update contract');
      } else {
        setSuccess('Contract updated successfully');
      }
    } catch (e) {
      setError('Failed to update contract');
    } finally {
      setSaving(false);
    }
  }

  if (permissionsLoading || loading || !isAdmin) {
    return <div className="min-h-[400px] flex items-center justify-center text-[var(--text-muted)]">Loading...</div>;
  }

  const selectableUnits = units.filter((unit) => {
    if (unit.locationId !== form.locationId) return false;
    if (String(unit.sizeSqft ?? '') !== unitSize) return false;
    return unit.status === 'AVAILABLE' || unit.id === form.unitId;
  });
  const sizeOptions = [...new Set(units.filter((unit) => unit.locationId === form.locationId).map((unit) => unit.sizeSqft).filter((value) => value !== null))]
    .sort((left, right) => Number(left) - Number(right));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/contracts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">Edit Contract</h1>
          <p className="mt-1 text-[var(--text-muted)]">Update terms, rates, and linked records.</p>
        </div>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
          <CardDescription>Contract updates are reflected in dashboards and reporting.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}
            {success && <div className="rounded-xl border border-[var(--success)] p-3 text-sm text-[var(--success)]">{success}</div>}

            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Contract number" value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_SIGNATURE">PENDING_SIGNATURE</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="TERMINATED">TERMINATED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <option value="">Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>
                ))}
              </select>
              <select value={form.locationId} onChange={(e) => {
                setForm({ ...form, locationId: e.target.value, unitId: '' });
                setUnitSize('');
              }} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <option value="">Location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <select value={unitSize} onChange={(e) => {
                setUnitSize(e.target.value);
                setForm({ ...form, unitId: '' });
              }} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <option value="">Unit size</option>
                {sizeOptions.map((size) => (
                  <option key={size} value={String(size)}>{formatUnitSizeLabel(size)}</option>
                ))}
              </select>
              <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                <option value="">Unit number</option>
                {selectableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>{formatUnitDisplayName(unit)}</option>
                ))}
              </select>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              <Input placeholder="Payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} />
              <Input placeholder="Weekly rate" value={form.weeklyRate} onChange={(e) => setForm({ ...form, weeklyRate: e.target.value })} />
              <Input placeholder="Monthly rate" value={form.monthlyRate} onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })} />
              <Input placeholder="Deposit" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Link href="/dashboard/contracts">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
