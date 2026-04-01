'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { User, Palette, Settings as SettingsIcon, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';

export default function SettingsPage() {
  const router = useRouter();
  const { update } = useSession();
  const { isAdmin, user: currentUser } = usePermissions();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [siteForm, setSiteForm] = useState({
    siteName: '',
    siteLogo: '',
    siteDescription: '',
    primaryColor: '#3b82f6',
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [siteMessage, setSiteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stats for admin
  const [stats, setStats] = useState({ total: 0, admins: 0, active: 0 });

  useEffect(() => {
    // Load current user data
    if (currentUser) {
      setProfileForm({
        username: currentUser.name || '',
        email: currentUser.email || '',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    // Load site settings
    if (!settingsLoading) {
      setSiteForm({
        siteName: settings.siteName,
        siteLogo: settings.siteLogo || '',
        siteDescription: settings.siteDescription || '',
        primaryColor: settings.primaryColor,
      });
    }
  }, [settings, settingsLoading]);

  useEffect(() => {
    // Load stats for admin
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  async function fetchStats() {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        setStats({
          total: users.length,
          admins: users.filter((u: any) => u.role === 'ADMIN').length,
          active: users.filter((u: any) => u.active).length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    try {
      const response = await fetch(`/api/users/${currentUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileForm.username || null,
          email: profileForm.email,
        }),
      });

      if (response.ok) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        update?.();
      } else {
        const data = await response.json();
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const response = await fetch(`/api/users/${currentUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSiteUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSiteLoading(true);
    setSiteMessage(null);

    try {
      await updateSettings({
        siteName: siteForm.siteName,
        siteLogo: siteForm.siteLogo || null,
        siteDescription: siteForm.siteDescription || null,
        primaryColor: siteForm.primaryColor,
      });
      setSiteMessage({ type: 'success', text: 'Site settings updated successfully!' });
    } catch (error) {
      setSiteMessage({ type: 'error', text: 'Failed to update site settings. Please try again.' });
    } finally {
      setSiteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>Settings</h1>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="site" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Site Settings</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {profileMessage && (
                    <div
                      className="rounded-lg p-3 text-sm"
                      style={{
                        backgroundColor: profileMessage.type === 'success' 
                          ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                          : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                        color: profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                      }}
                    >
                      {profileMessage.text}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">
                      Username
                    </label>
                    <Input
                      id="username"
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      placeholder="Enter your username"
                      maxLength={12}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="Enter your email"
                    />
                  </div>

                  <Button type="submit" disabled={profileLoading}>
                    {profileLoading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  {passwordMessage && (
                    <div
                      className="rounded-lg p-3 text-sm"
                      style={{
                        backgroundColor: passwordMessage.type === 'success' 
                          ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                          : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                        color: passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                      }}
                    >
                      {passwordMessage.text}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      required
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
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Choose your preferred theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-strong)' }}>Color Theme</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select Light, Dark, or System preference</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-2)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Current theme: <Badge variant="secondary">{theme}</Badge>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Settings Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="site">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Admin Only</Badge>
                </div>
                <CardTitle>Site Settings</CardTitle>
                <CardDescription>
                  Configure the site appearance and branding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSiteUpdate} className="space-y-6">
                  {siteMessage && (
                    <div
                      className="rounded-lg p-3 text-sm"
                      style={{
                        backgroundColor: siteMessage.type === 'success' 
                          ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                          : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                        color: siteMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${siteMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                      }}
                    >
                      {siteMessage.text}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="siteName" className="text-sm font-medium">
                      Site Name
                    </label>
                    <Input
                      id="siteName"
                      type="text"
                      value={siteForm.siteName}
                      onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })}
                      placeholder="Skeleton"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="siteLogo" className="text-sm font-medium">
                      Logo URL
                    </label>
                    <Input
                      id="siteLogo"
                      type="url"
                      value={siteForm.siteLogo}
                      onChange={(e) => setSiteForm({ ...siteForm, siteLogo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                    {siteForm.siteLogo && (
                      <div className="mt-2 p-4 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-2)' }}>
                        <img src={siteForm.siteLogo} alt="Logo preview" className="h-16 w-16 rounded-xl object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="siteDescription" className="text-sm font-medium">
                      Description
                    </label>
                    <textarea
                      id="siteDescription"
                      value={siteForm.siteDescription}
                      onChange={(e) => setSiteForm({ ...siteForm, siteDescription: e.target.value })}
                      placeholder="A Next.js authentication starter"
                      className="w-full min-h-[100px] rounded-xl border px-3 py-2 text-sm resize-none"
                      style={{ 
                        borderColor: 'var(--border)', 
                        backgroundColor: 'var(--surface-0)',
                        color: 'var(--text-strong)'
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="primaryColor" className="text-sm font-medium">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        id="primaryColor"
                        type="color"
                        value={siteForm.primaryColor}
                        onChange={(e) => setSiteForm({ ...siteForm, primaryColor: e.target.value })}
                        className="h-10 w-20 rounded-lg cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={siteForm.primaryColor}
                        onChange={(e) => setSiteForm({ ...siteForm, primaryColor: e.target.value })}
                        className="w-32"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={siteLoading}>
                    {siteLoading ? 'Saving...' : 'Save Site Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Users Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Admin Only</Badge>
                </div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Quick Stats */}
                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>{stats.total}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Users</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stats.admins}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Admins</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{stats.active}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active</p>
                  </div>
                </div>

                <Link href="/dashboard/users">
                  <Button variant="outline" className="w-full">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
