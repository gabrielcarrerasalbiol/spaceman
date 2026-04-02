'use client';

import { useEffect, useState } from 'react';
import { Box, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';

interface LocationOption {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  code: string;
  name: string | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  weeklyRate: string | null;
  location: {
    name: string;
  };
  _count: {
    contracts: number;
  };
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  OCCUPIED: 'secondary',
  MAINTENANCE: 'danger',
  INACTIVE: 'secondary',
};

export default function UnitsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [code, setCode] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [search]);

  async function fetchLocations() {
    const response = await fetch('/api/locations');
    if (response.ok) {
      const data = await response.json();
      setLocations(data);
      if (!locationId && data.length > 0) {
        setLocationId(data[0].id);
      }
    }
  }

  async function fetchUnits() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/units?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUnits(data);
      }
    } catch (error) {
      console.error('Failed to load units:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createUnit() {
    if (!locationId || !code.trim()) return;

    const response = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        code,
        weeklyRate,
      }),
    });

    if (response.ok) {
      setCode('');
      setWeeklyRate('');
      fetchUnits();
    }
  }

  async function deleteUnit(id: string) {
    const response = await fetch(`/api/units/${id}`, { method: 'DELETE' });
    if (response.ok) fetchUnits();
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-strong)]">Units</h1>
        <p className="mt-2 text-[var(--text-muted)]">Track inventory and unit availability by location.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Unit</CardTitle>
          <CardDescription>Create a basic unit record.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-10 rounded-xl border px-3 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <Input placeholder="Unit code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="Weekly rate" value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} />
            <Button onClick={createUnit}>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Units</CardTitle>
          <CardDescription>Search units and review occupancy status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search units..." className="pl-10" />
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[var(--text-muted)]">Loading units...</p>
          ) : units.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <Box className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No units found.
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Weekly</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="font-medium">{unit.code}</div>
                        {unit.name && <div className="text-xs text-[var(--text-muted)]">{unit.name}</div>}
                      </TableCell>
                      <TableCell>{unit.location?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[unit.status] || 'secondary'}>{unit.status}</Badge>
                      </TableCell>
                      <TableCell>{unit.weeklyRate ? `£${unit.weeklyRate}` : '-'}</TableCell>
                      <TableCell>{unit._count?.contracts || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.location.href = `/dashboard/units/${unit.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteUnit(unit.id)}>
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
    </div>
  );
}
