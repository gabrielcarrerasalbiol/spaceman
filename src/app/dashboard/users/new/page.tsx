'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';

export default function NewUserPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();
  
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, permissionsLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          username: form.username || null,
          password: form.password,
          role: form.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }

      router.push('/dashboard/users');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (permissionsLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>Create User</h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            Add a new user to the system
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Enter the information for the new user
          </CardDescription>
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

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
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
                placeholder="johndoe"
                maxLength={12}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Max 12 characters, optional
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Confirm password"
                required
              />
            </div>

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

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Link href="/dashboard/users">
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
