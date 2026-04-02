'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';

interface Location {
  id: string;
  name: string;
  code: string | null;
  townCity: string | null;
  postcode: string | null;
  active: boolean;
  _count: {
    units: number;
    contracts: number;
  };
}

export default function LocationsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [townCity, setTownCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [permissionsLoading, isAdmin, router]);

  useEffect(() => {
    fetchLocations();
  }, [search]);

  async function fetchLocations() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/locations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createLocation() {
    if (!name.trim()) return;

    const response = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, townCity, postcode }),
    });

    if (response.ok) {
      setName('');
      setTownCity('');
      setPostcode('');
      fetchLocations();
    }
  }

  async function deleteLocation(id: string) {
    const response = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
    if (response.ok) fetchLocations();
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-strong)]">Locations</h1>
        <p className="mt-2 text-[var(--text-muted)]">Manage storage locations and branches.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Location</CardTitle>
          <CardDescription>Create a new branch location.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Location name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Town/City" value={townCity} onChange={(e) => setTownCity(e.target.value)} />
            <Input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
            <Button onClick={createLocation}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>Search and maintain location records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search locations..." className="pl-10" />
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-[var(--text-muted)]">Loading locations...</p>
          ) : locations.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <MapPin className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No locations found.
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="font-medium">{location.name}</div>
                        {location.code && <div className="text-xs text-[var(--text-muted)]">{location.code}</div>}
                      </TableCell>
                      <TableCell>{location.townCity || location.postcode || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={location.active ? 'success' : 'danger'}>
                          {location.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{location._count?.units || 0}</TableCell>
                      <TableCell>{location._count?.contracts || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => deleteLocation(location.id)}>
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
