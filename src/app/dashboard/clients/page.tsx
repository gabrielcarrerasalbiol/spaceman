'use client';

import { useEffect, useState } from 'react';
import { Edit, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'LEAD';
  _count: {
    contracts: number;
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

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

  async function createClient() {
    if (!firstName.trim() || !lastName.trim()) return;

    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email }),
    });

    if (response.ok) {
      setFirstName('');
      setLastName('');
      setEmail('');
      fetchClients();
    }
  }

  async function deleteClient(id: string) {
    const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (response.ok) fetchClients();
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-strong)]">Clients</h1>
        <p className="mt-2 text-[var(--text-muted)]">Store and manage customer records.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Client</CardTitle>
          <CardDescription>Create a new customer profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={createClient}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </CardContent>
      </Card>

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
            <div className="rounded-xl border border-[var(--border)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="font-medium">{client.firstName} {client.lastName}</div>
                        {client.companyName && (
                          <div className="text-xs text-[var(--text-muted)]">{client.companyName}</div>
                        )}
                      </TableCell>
                      <TableCell>{client.email || client.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'ACTIVE' ? 'success' : client.status === 'LEAD' ? 'warning' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{client._count?.contracts || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.location.href = `/dashboard/clients/${client.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteClient(client.id)}>
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
