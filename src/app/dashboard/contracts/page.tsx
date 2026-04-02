'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  const [clientId, setClientId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');

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

    if (clientsRes.ok) {
      const data = await clientsRes.json();
      setClients(data);
      if (data.length > 0) setClientId(data[0].id);
    }

    if (unitsRes.ok) {
      const data = await unitsRes.json();
      setUnits(data);
      if (data.length > 0) setUnitId(data[0].id);
    }

    if (locationsRes.ok) {
      const data = await locationsRes.json();
      setLocations(data);
      if (data.length > 0) setLocationId(data[0].id);
    }
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

  async function createContract() {
    if (!clientId || !unitId || !locationId || !startDate) return;

    const response = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        unitId,
        locationId,
        startDate,
      }),
    });

    if (response.ok) {
      setStartDate('');
      fetchContracts();
    }
  }

  async function deleteContract(id: string) {
    const response = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
    if (response.ok) fetchContracts();
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-strong)]">Contracts</h1>
        <p className="mt-2 text-[var(--text-muted)]">Manage unit reservations and customer contracts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Contract</CardTitle>
          <CardDescription>Link a client, unit, and location to start a contract.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
              <option value="">Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </select>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
              <option value="">Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.code}</option>
              ))}
            </select>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-10 rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
              <option value="">Location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Button onClick={createContract}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contract
            </Button>
          </div>
        </CardContent>
      </Card>

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
                        <Button variant="outline" size="sm" onClick={() => deleteContract(contract.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
