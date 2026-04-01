'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Shield, Users as UsersIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';

interface User {
  id: string;
  email: string;
  username: string | null;
  role: string;
  active: boolean;
  banned: boolean;
  createdAt: string;
  lastLogin: string | null;
}

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, loading: permissionsLoading } = usePermissions();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, permissionsLoading, router]);

  useEffect(() => {
    fetchUsers();
  }, [search]);

  async function fetchUsers() {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const response = await fetch(`/api/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  }

  async function handleDelete(userId: string) {
    if (deleteConfirm !== userId) {
      setDeleteConfirm(userId);
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-strong)]">User Management</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Manage users and their permissions
          </p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard/users/new'}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            A list of all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                type="search"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <UsersIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-[var(--text-strong)]">{user.username || 'No username'}</div>
                          <div className="text-sm text-[var(--text-muted)]">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {user.role === 'ADMIN' && <Shield className="mr-1 h-3 w-3" />}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'success' : 'danger'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/dashboard/users/${user.id}/edit`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(user.id, user.active)}
                            title={user.active ? 'Deactivate user' : 'Activate user'}
                          >
                            {user.active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className={deleteConfirm === user.id ? 'border-[var(--danger)] text-[var(--danger)]' : ''}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {deleteConfirm === user.id && (
                          <p className="text-xs mt-1 text-[var(--danger)]">
                            Click again to confirm deletion
                          </p>
                        )}
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

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    }>
      <UsersContent />
    </Suspense>
  );
}
