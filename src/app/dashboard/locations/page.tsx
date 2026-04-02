'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';

interface Location {
  id: string;
  name: string;
  code: string | null;
  addressLine1: string | null;
  townCity: string | null;
  postcode: string | null;
  latitude: string | null;
  longitude: string | null;
  active: boolean;
  _count: {
    units: number;
    contracts: number;
  };
}

type MapLocation = {
  id: string;
  name: string;
  townCity: string | null;
  postcode: string | null;
  lat: number;
  lng: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function LocationsMap({ locations }: { locations: MapLocation[] }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || locations.length === 0) {
      return;
    }

    let cancelled = false;
    let map: any = null;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !mapContainerRef.current) {
        return;
      }

      map = L.map(mapContainerRef.current, {
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      for (const location of locations) {
        const marker = L.circleMarker([location.lat, location.lng], {
          radius: 7,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);

        marker.bindPopup(
          `<strong>${escapeHtml(location.name)}</strong><br/>${escapeHtml(
            [location.townCity, location.postcode].filter(Boolean).join(' ')
          )}`
        );

        bounds.extend([location.lat, location.lng]);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2));
      }
    }

    init();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
    };
  }, [locations]);

  return <div ref={mapContainerRef} className="h-[560px] w-full rounded-xl border border-[var(--border)]" />;
}

export default function LocationsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [townCity, setTownCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);

  const mappedLocations = useMemo<MapLocation[]>(() => {
    return locations
      .map((location) => {
        const lat = Number(location.latitude);
        const lng = Number(location.longitude);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        return {
          id: location.id,
          name: location.name,
          townCity: location.townCity,
          postcode: location.postcode,
          lat,
          lng,
        };
      })
      .filter((location): location is MapLocation => location !== null);
  }, [locations]);

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
      body: JSON.stringify({ name, addressLine1, townCity, postcode, latitude, longitude }),
    });

    if (response.ok) {
      setName('');
      setAddressLine1('');
      setTownCity('');
      setPostcode('');
      setLatitude('');
      setLongitude('');
      fetchLocations();
    }
  }

  async function handleGeocode() {
    const query = [addressLine1, townCity, postcode].filter(Boolean).join(', ');
    if (!query) return;

    try {
      setGeocoding(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return;

      setLatitude(String(data[0].lat));
      setLongitude(String(data[0].lon));
    } catch (error) {
      console.error('Geocode failed:', error);
    } finally {
      setGeocoding(false);
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
          <CardDescription>Create a new branch location with optional geocoding.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Location name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Address line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            <Input placeholder="Town/City" value={townCity} onChange={(e) => setTownCity(e.target.value)} />
            <Input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
            <Input placeholder="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            <Input placeholder="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleGeocode} disabled={geocoding}>
              {geocoding ? 'Geocoding...' : 'Geocode'}
            </Button>
            <Button onClick={createLocation}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
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
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => window.location.href = `/dashboard/locations/${location.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => deleteLocation(location.id)}>
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
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Locations Map</CardTitle>
              <CardDescription>Mapped view for locations with latitude and longitude.</CardDescription>
            </CardHeader>
            <CardContent>
              {mappedLocations.length === 0 ? (
                <p className="text-[var(--text-muted)]">No coordinates found yet. Add lat/lng manually or use Geocode.</p>
              ) : (
                <div className="space-y-3">
                  <LocationsMap locations={mappedLocations} />
                  <p className="text-xs text-[var(--text-muted)]">
                    Showing {mappedLocations.length} mapped location{mappedLocations.length === 1 ? '' : 's'}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
