'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  User,
  Palette,
  Settings as SettingsIcon,
  Users,
  ArrowRight,
  Upload,
  X,
  Shield,
  Lock,
  TrendingUp,
  Activity,
  Crown,
  Mail,
  Key,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import RoleDesigner from '@/components/role-designer';

export default function SettingsPage() {
  const router = useRouter();
  const { update } = useSession();
  const { data: session } = useSession();
  const { isAdmin, canManageRoles, user: currentUser } = usePermissions();

  // Enhanced debugging
  useEffect(() => {
    console.log('=== SETTINGS PAGE DEBUG ===');
    console.log('Full session:', session);
    console.log('Session user:', session?.user);
    console.log('Session user role:', (session?.user as any)?.role);
    console.log('Type of role:', typeof (session?.user as any)?.role);
    console.log('isAdmin from hook:', isAdmin);
    console.log('currentUser:', currentUser);
    console.log('currentUser role:', currentUser?.role);
    console.log('==========================');
  }, [session, isAdmin, currentUser]);

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    active: 0,
    recentLogins: 0,
    profileCompletion: 0
  });

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        username: currentUser.name || '',
        email: currentUser.email || '',
      });

      // Calculate profile completion
      const completion = [
        currentUser.name ? 25 : 0,
        currentUser.email ? 25 : 0,
        25, // Has account
        25, // Is active
      ].reduce((acc: number, val: number) => acc + val, 0);
      setStats(prev => ({ ...prev, profileCompletion: completion }));
    }
  }, [currentUser]);

  useEffect(() => {
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
    if (isAdmin) {
      fetchStats();
      fetchUsersAndRoles();
    }
  }, [isAdmin]);

  async function fetchUsersAndRoles() {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/users/list'),
        fetch('/api/roles')
      ]);

      if (usersRes.ok) {
        const users = await usersRes.json();
        setAllUsers(users);
      }

      if (rolesRes.ok) {
        const roles = await rolesRes.json();
        setRoles(roles);
      }
    } catch (error) {
      console.error('Failed to fetch users and roles:', error);
    }
  }

  async function assignRole(userId: string, roleId: string | null) {
    try {
      const response = await fetch('/api/users/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId }),
      });

      if (response.ok) {
        await fetchUsersAndRoles();
        alert('Role updated successfully!');
      } else {
        alert('Failed to update role');
      }
    } catch (error) {
      console.error('Role assignment error:', error);
      alert('Failed to update role');
    }
  }

  async function fixMyRole() {
    try {
      const response = await fetch('/api/fix-role', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Role fixed! You are now: ${data.user.role}`);
        window.location.reload();
      } else {
        alert('Failed to fix role');
      }
    } catch (error) {
      console.error('Role fix error:', error);
      alert('Failed to fix role');
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        const recentLogins = users.filter((u: any) => {
          if (!u.lastLogin) return false;
          const loginDate = new Date(u.lastLogin);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return loginDate > weekAgo;
        }).length;

        setStats({
          total: users.length,
          admins: users.filter((u: any) => u.role === 'ADMIN').length,
          active: users.filter((u: any) => u.active).length,
          recentLogins,
          profileCompletion: stats.profileCompletion,
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

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    setSiteMessage(null);

    console.log('=== CLIENT UPLOAD START ===');
    console.log('File:', file.name, file.type, file.size);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      console.log('Sending request to /api/upload');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setSiteForm({ ...siteForm, siteLogo: data.url });
        setSiteMessage({ type: 'success', text: 'Logo uploaded successfully!' });
        console.log('Upload successful:', data.url);
      } else {
        console.error('Upload failed:', data);
        setSiteMessage({ type: 'error', text: data.error || data.details || 'Failed to upload logo' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSiteMessage({ type: 'error', text: `Failed to upload logo: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setUploadingLogo(false);
      console.log('=== CLIENT UPLOAD END ===');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleLogoUpload(file);
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

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
    description
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    trend?: string;
    description?: string;
  }) => (
    <div className="relative overflow-hidden rounded-2xl p-6 border transition-all hover:shadow-lg"
         style={{
           borderColor: 'var(--border)',
           backgroundColor: 'var(--surface-0)'
         }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            {title}
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>
            {value}
          </p>
          {description && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" style={{ color }} />
              <span className="text-xs font-medium" style={{ color }}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl"
             style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, var(--surface-0))` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: 'var(--text-strong)' }}>
            Settings
          </h1>
          <p className="mt-2 text-lg" style={{ color: 'var(--text-muted)' }}>
            Manage your account and application settings
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border"
             style={{
               borderColor: 'var(--accent)',
               backgroundColor: `color-mix(in srgb, var(--accent) 16%, var(--surface-0))`
             }}>
          <Shield className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          <div className="text-left">
            <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              {isAdmin ? 'Admin Access' : 'User Access'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Role: {(session?.user as any)?.role || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Stats Overview */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.total}
            icon={Users}
            color="var(--accent)"
            description="Registered accounts"
          />
          <StatCard
            title="Active Users"
            value={stats.active}
            icon={Activity}
            color="var(--success)"
            trend={`${Math.round((stats.active / stats.total) * 100)}% of total`}
          />
          <StatCard
            title="Administrators"
            value={stats.admins}
            icon={Crown}
            color="var(--warning)"
            description="Full access users"
          />
          <StatCard
            title="Recent Logins"
            value={stats.recentLogins}
            icon={Zap}
            color="var(--danger)"
            description="Last 7 days"
          />
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full justify-start rounded-xl p-1 flex-wrap">
          <TabsTrigger value="profile" className="flex items-center gap-2 rounded-lg">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 rounded-lg">
            <Lock className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>

          {/* Always show these tabs for debugging - we'll hide content based on permissions */}
          <TabsTrigger value="branding" className="flex items-center gap-2 rounded-lg">
            <ImageIcon className="h-4 w-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 rounded-lg">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          {(isAdmin || canManageRoles) && (
            <TabsTrigger value="roles" className="flex items-center gap-2 rounded-lg">
              <Shield className="h-4 w-4" />
              <span>Roles</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Completion Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full"
                       style={{ backgroundColor: `color-mix(in srgb, var(--accent) 16%, var(--surface-0))` }}>
                    <User className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-strong)' }}>
                      Profile Completion
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Complete your profile to get the most out of the platform
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                    {stats.profileCompletion}%
                  </p>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden"
                   style={{ backgroundColor: 'var(--surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.profileCompletion}%`,
                    backgroundColor: 'var(--accent)'
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                     style={{ backgroundColor: `color-mix(in srgb, var(--accent) 16%, var(--surface-0))` }}>
                  <User className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {profileMessage && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border"
                       style={{
                         backgroundColor: profileMessage.type === 'success'
                           ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                           : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                         borderColor: profileMessage.type === 'success'
                           ? 'color-mix(in srgb, var(--success) 40%, var(--border))'
                           : 'color-mix(in srgb, var(--danger) 40%, var(--border))',
                       }}>
                    {profileMessage.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: 'var(--success)' }} />
                    ) : (
                      <XCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--danger)' }} />
                    )}
                    <div>
                      <p className="font-medium" style={{
                        color: profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {profileMessage.type === 'success' ? 'Success' : 'Error'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {profileMessage.text}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="username" className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      Username
                    </label>
                    <Input
                      id="username"
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      placeholder="Enter your username"
                      maxLength={12}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="Enter your email"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={profileLoading} className="rounded-xl px-6">
                    {profileLoading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                     style={{ backgroundColor: `color-mix(in srgb, var(--warning) 16%, var(--surface-0))` }}>
                  <Key className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                </div>
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                {passwordMessage && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border"
                       style={{
                         backgroundColor: passwordMessage.type === 'success'
                           ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                           : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                         borderColor: passwordMessage.type === 'success'
                           ? 'color-mix(in srgb, var(--success) 40%, var(--border))'
                           : 'color-mix(in srgb, var(--danger) 40%, var(--border))',
                       }}>
                    {passwordMessage.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: 'var(--success)' }} />
                    ) : (
                      <XCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--danger)' }} />
                    )}
                    <div>
                      <p className="font-medium" style={{
                        color: passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {passwordMessage.type === 'success' ? 'Success' : 'Error'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {passwordMessage.text}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="flex items-center gap-2 text-sm font-medium">
                      <Key className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
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
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      Confirm New Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      required
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordLoading} className="rounded-xl px-6">
                    {passwordLoading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab - Always visible for debugging */}
        <TabsContent value="branding">
            <div className="space-y-6">
              {/* Logo Upload Card - PROMINENT */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                         style={{ backgroundColor: `color-mix(in srgb, var(--accent) 16%, var(--surface-0))` }}>
                      <ImageIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <CardTitle>Site Logo & Branding</CardTitle>
                      <CardDescription>Upload your logo to customize the site appearance</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {siteMessage && (
                    <div className="flex items-start gap-3 p-4 rounded-xl border"
                         style={{
                           backgroundColor: siteMessage.type === 'success'
                             ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                             : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                           borderColor: siteMessage.type === 'success'
                             ? 'color-mix(in srgb, var(--success) 40%, var(--border))'
                             : 'color-mix(in srgb, var(--danger) 40%, var(--border))',
                         }}>
                      {siteMessage.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: 'var(--success)' }} />
                      ) : (
                        <XCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--danger)' }} />
                      )}
                      <div>
                        <p className="font-medium" style={{
                          color: siteMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {siteMessage.type === 'success' ? 'Success' : 'Error'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {siteMessage.text}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Drag & Drop Upload Area */}
                  <div className="space-y-4">
                    <label className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
                      Upload Your Logo
                    </label>

                    {!siteForm.siteLogo ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="relative flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border-2 border-dashed transition-all"
                        style={{
                          borderColor: dragOver
                            ? 'var(--accent)'
                            : 'var(--border)',
                          backgroundColor: dragOver
                            ? 'color-mix(in srgb, var(--accent) 8%, var(--surface-0))'
                            : 'var(--surface-0)'
                        }}
                      >
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                          onChange={handleFileSelect}
                          disabled={uploadingLogo}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        <div className="flex h-16 w-16 items-center justify-center rounded-full"
                             style={{ backgroundColor: `color-mix(in srgb, var(--accent) 16%, var(--surface-0))` }}>
                          {uploadingLogo ? (
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
                                 style={{ color: 'var(--accent)' }} />
                          ) : (
                            <Upload className="h-8 w-8" style={{ color: 'var(--accent)' }} />
                          )}
                        </div>

                        <div className="text-center">
                          <p className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
                            {uploadingLogo ? 'Uploading...' : 'Drop your logo here'}
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            or click to browse files
                          </p>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                             style={{ backgroundColor: 'var(--surface-2)' }}>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            PNG, JPEG, GIF, WebP, SVG up to 5MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Logo Preview with Remove Option */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-6 rounded-2xl border"
                             style={{
                               borderColor: 'var(--border)',
                               backgroundColor: 'var(--surface-0)'
                             }}>
                          <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl p-2"
                                 style={{ backgroundColor: 'var(--surface-2)' }}>
                              <img
                                src={siteForm.siteLogo}
                                alt="Logo preview"
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--text-strong)' }}>
                                Current Logo
                              </p>
                              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                {siteForm.siteLogo.split('/').pop()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition hover:opacity-80"
                                   style={{
                                     borderColor: 'var(--border)',
                                     backgroundColor: 'var(--surface-0)'
                                   }}>
                              <Upload className="h-4 w-4" />
                              <span className="text-sm font-medium">Replace</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                                onChange={handleFileSelect}
                                disabled={uploadingLogo}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => setSiteForm({ ...siteForm, siteLogo: '' })}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border transition hover:opacity-80"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--danger) 40%, var(--border))',
                                backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface-0))',
                                color: 'var(--danger)'
                              }}
                            >
                              <X className="h-4 w-4" />
                              <span className="text-sm font-medium">Remove</span>
                            </button>
                          </div>
                        </div>

                        {/* Live Previews */}
                        <div>
                          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                            Live Previews:
                          </p>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="p-4 rounded-xl border"
                                 style={{
                                   borderColor: 'var(--border)',
                                   backgroundColor: 'var(--surface-0)'
                                 }}>
                              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                                Login Page (80x80)
                              </p>
                              <div className="flex items-center justify-center h-20 rounded-xl"
                                   style={{ backgroundColor: 'var(--surface-2)' }}>
                                <img
                                  src={siteForm.siteLogo}
                                  alt="Login preview"
                                  className="h-16 w-16 rounded-xl object-contain"
                                />
                              </div>
                            </div>

                            <div className="p-4 rounded-xl border"
                                 style={{
                                   borderColor: 'var(--border)',
                                   backgroundColor: 'var(--surface-0)'
                                 }}>
                              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                                Sidebar (40x40)
                              </p>
                              <div className="flex items-center justify-center h-20 rounded-xl"
                                   style={{ backgroundColor: 'var(--surface-2)' }}>
                                <img
                                  src={siteForm.siteLogo}
                                  alt="Sidebar preview"
                                  className="h-10 w-10 rounded-xl object-contain"
                                />
                              </div>
                            </div>

                            <div className="p-4 rounded-xl border"
                                 style={{
                                   borderColor: 'var(--border)',
                                   backgroundColor: 'var(--surface-0)'
                                 }}>
                              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                                Mobile Header (32x32)
                              </p>
                              <div className="flex items-center justify-center h-20 rounded-xl"
                                   style={{ backgroundColor: 'var(--surface-2)' }}>
                                <img
                                  src={siteForm.siteLogo}
                                  alt="Mobile preview"
                                  className="h-8 w-8 rounded-xl object-contain"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* URL Input Alternative */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                      <span className="text-xs px-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                        OR USE URL
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                    </div>

                    <div>
                      <label htmlFor="siteLogo" className="text-sm font-medium">
                        Logo URL
                      </label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="siteLogo"
                          type="url"
                          value={siteForm.siteLogo}
                          onChange={(e) => setSiteForm({ ...siteForm, siteLogo: e.target.value })}
                          placeholder="https://example.com/logo.png"
                          className="rounded-xl flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (siteForm.siteLogo) {
                              setSiteForm({ ...siteForm, siteLogo: siteForm.siteLogo });
                              setSiteMessage({ type: 'success', text: 'Logo URL set!' });
                            }
                          }}
                          variant="outline"
                          className="rounded-xl"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Site Settings Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                         style={{ backgroundColor: `color-mix(in srgb, var(--success) 16%, var(--surface-0))` }}>
                      <SettingsIcon className="h-4 w-4" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                      <CardTitle>General Settings</CardTitle>
                      <CardDescription>Configure your site name and appearance</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSiteUpdate} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="siteName" className="text-sm font-medium">
                          Site Name
                        </label>
                        <Input
                          id="siteName"
                          type="text"
                          value={siteForm.siteName}
                          onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })}
                          placeholder="My Awesome Site"
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="primaryColor" className="text-sm font-medium">
                          Primary Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            id="primaryColor"
                            type="color"
                            value={siteForm.primaryColor}
                            onChange={(e) => setSiteForm({ ...siteForm, primaryColor: e.target.value })}
                            className="h-10 w-16 rounded-lg cursor-pointer border-0"
                          />
                          <Input
                            type="text"
                            value={siteForm.primaryColor}
                            onChange={(e) => setSiteForm({ ...siteForm, primaryColor: e.target.value })}
                            className="rounded-xl flex-1 font-mono text-sm"
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="siteDescription" className="text-sm font-medium">
                        Site Description
                      </label>
                      <textarea
                        id="siteDescription"
                        value={siteForm.siteDescription}
                        onChange={(e) => setSiteForm({ ...siteForm, siteDescription: e.target.value })}
                        placeholder="A brief description of your site..."
                        rows={3}
                        className="w-full rounded-xl border px-3 py-2 text-sm resize-none"
                        style={{
                          borderColor: 'var(--border)',
                          backgroundColor: 'var(--surface-0)',
                          color: 'var(--text-strong)'
                        }}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={siteLoading} className="rounded-xl px-6">
                        {siteLoading ? 'Saving...' : 'Save All Settings'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        {/* Users Tab - Always visible for debugging */}
        <TabsContent value="users">
            {/* Role Management */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                         style={{ backgroundColor: `color-mix(in srgb, var(--warning) 16%, var(--surface-0))` }}>
                      <Crown className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                    </div>
                    <div>
                      <CardTitle>Fix Your Role</CardTitle>
                      <CardDescription>If you're seeing "Unknown" role, click here to fix it</CardDescription>
                    </div>
                  </div>
                  <Button onClick={fixMyRole} className="rounded-xl">
                    Fix My Role
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                       style={{ backgroundColor: `color-mix(in srgb, var(--warning) 16%, var(--surface-0))` }}>
                    <Users className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                  </div>
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage users and their permissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    title="Total Users"
                    value={stats.total}
                    icon={Users}
                    color="var(--accent)"
                  />
                  <StatCard
                    title="Administrators"
                    value={stats.admins}
                    icon={Crown}
                    color="var(--warning)"
                  />
                  <StatCard
                    title="Active Users"
                    value={stats.active}
                    icon={Activity}
                    color="var(--success)"
                  />
                </div>

                <Link href="/dashboard/users">
                  <Button variant="outline" className="w-full rounded-xl">
                    <Users className="mr-2 h-4 w-4" />
                    Manage All Users
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

        {(isAdmin || canManageRoles) && (
          <TabsContent value="roles">
            <RoleDesigner />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
