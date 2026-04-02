'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';

interface UserData {
  id: string;
  email: string;
  username: string | null;
  role: string;
  active: boolean;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAdmin, loading: permissionsLoading } = usePermissions();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
    active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsLoading) {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      
      // Allow admins or the user themselves
      if (!isAdmin && currentUser.id !== params.id as string) {
        router.push('/dashboard');
        return;
      }
      
      fetchUser();
    }
  }, [currentUser, isAdmin, permissionsLoading, params.id as string]);

  async function fetchUser() {
    try {
      const response = await fetch(`/api/users/${params.id as string}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setForm({
          email: data.email,
          username: data.username || '',
          password: '',
          confirmPassword: '',
          role: data.role,
          active: data.active,
        });
      } else {
        router.push('/dashboard/users');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password && form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);

    try {
      const body: any = {
        email: form.email,
        username: form.username || null,
      };

      if (form.password) {
        body.password = form.password;
      }

      // Only admins can change role and active status
      if (isAdmin) {
        body.role = form.role;
        body.active = form.active;
      }

      const response = await fetch(`/api/users/${params.id as string}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update user');
        return;
      }

      setSuccess('User updated successfully!');
      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
      
      // Refresh user data
      fetchUser();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isAdmin ? '/dashboard/users' : '/dashboard/settings'}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>
            {isAdmin ? 'Edit User' : 'Profile'}
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            {isAdmin ? 'Update user information' : 'Update your profile information'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>
                {isAdmin ? 'Manage user account settings' : 'Manage your account settings'}
              </CardDescription>
            </div>
            {user && (
              <Badge variant={user.active ? 'success' : 'danger'}>
                {user.active ? 'Active' : 'Inactive'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div 
                className="rounded-xl p-4 text-sm"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)'
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div 
                className="rounded-xl p-4 text-sm"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--success) 16%, var(--surface-0))',
                  color: 'var(--success)',
                  border: '1px solid var(--success)'
                }}
              >
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Optional"
                maxLength={12}
              />
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-medium mb-4">Change Password</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    minLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-lg font-medium">Admin Controls</h3>
                
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Role
                  </label>
                  <Select
                    value={form.role}
                    onValueChange={(value) => setForm({ ...form, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="active" className="text-sm font-medium">
                    Active Account
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Link href={isAdmin ? '/dashboard/users' : '/dashboard/settings'}>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
