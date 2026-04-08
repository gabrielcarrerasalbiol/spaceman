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
  Zap,
  Globe,
  MapPin,
  Building2,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import RoleDesigner from '@/components/role-designer';
import { UNIT_STATUSES, type StatusConfig } from '@/lib/status-config';

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
    firstName: '',
    lastName: '',
    phone: '',
    mobile: '',
    avatar: '',
    addressLine1: '',
    addressLine2: '',
    townCity: '',
    county: '',
    postcode: '',
    country: '',
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
  const [statusForm, setStatusForm] = useState<StatusConfig>(settings.unitStatusConfig);
  const [wordpressForm, setWordpressForm] = useState({
    siteUrl: '',
    apiUsername: '',
    apiPassword: '',
    enabled: false,
    locationsEndpoint: 'wp-json/spaceman/v1/locations',
    unitsEndpoint: 'wp-json/spaceman/v1/units',
  });

  const [hubspotForm, setBuilding2Form] = useState({
    apiKey: '',
    portalId: '',
    enabled: false,
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [wordpressLoading, setWordpressLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [siteMessage, setSiteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [wordpressMessage, setWordpressMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hubspotLoading, setBuilding2Loading] = useState(false);
  const [hubspotMessage, setBuilding2Message] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [wordpressTestOpen, setWordpressTestOpen] = useState(false);
  const [wordpressTestRunning, setWordpressTestRunning] = useState(false);
  const [wordpressTestLogs, setWordpressTestLogs] = useState<string[]>([]);
  const [wordpressTestSummary, setWordpressTestSummary] = useState<{ ok: boolean; text: string } | null>(null);
  const [wordpressPullOpen, setWordpressPullOpen] = useState(false);
  const [wordpressPullRunning, setWordpressPullRunning] = useState(false);
  const [wordpressPullLogs, setWordpressPullLogs] = useState<string[]>([]);
  const [wordpressPullSummary, setWordpressPullSummary] = useState<{ ok: boolean; text: string } | null>(null);
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

  // Activity Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogFilters, setAuditLogFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    entityType: '',
    search: '',
  });
  const [auditLogPagination, setAuditLogPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  // HubSpot owners import state
  const [hubspotOwnersOpen, setHubspotOwnersOpen] = useState(false);
  const [hubspotOwnersLoading, setHubspotOwnersLoading] = useState(false);
  const [hubspotOwners, setHubspotOwners] = useState<any[]>([]);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<string>>(new Set());
  const [hubspotImportResult, setHubspotImportResult] = useState<any>(null);
  const [importingOwners, setImportingOwners] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const userData = currentUser as any;

    setProfileForm({
      username: userData.username || '',
      email: currentUser.email || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phone: userData.phone || '',
      mobile: userData.mobile || '',
      avatar: userData.avatar || '',
      addressLine1: userData.addressLine1 || '',
      addressLine2: userData.addressLine2 || '',
      townCity: userData.townCity || '',
      county: userData.county || '',
      postcode: userData.postcode || '',
      country: userData.country || '',
    });

    const completion = [
      userData.firstName && userData.lastName ? 20 : 0,
      currentUser.email ? 20 : 0,
      userData.phone || userData.mobile ? 20 : 0,
      userData.addressLine1 && userData.townCity ? 20 : 0,
      userData.avatar ? 20 : 0,
    ].reduce((acc: number, val: number) => acc + val, 0);

    setStats(prev => ({ ...prev, profileCompletion: completion }));
  }, [
    currentUser?.id,
    currentUser?.email,
    (currentUser as any)?.username,
    (currentUser as any)?.firstName,
    (currentUser as any)?.lastName,
    (currentUser as any)?.phone,
    (currentUser as any)?.mobile,
    (currentUser as any)?.avatar,
    (currentUser as any)?.addressLine1,
    (currentUser as any)?.addressLine2,
    (currentUser as any)?.townCity,
    (currentUser as any)?.county,
    (currentUser as any)?.postcode,
    (currentUser as any)?.country,
  ]);

  useEffect(() => {
    if (!settingsLoading) {
      setSiteForm({
        siteName: settings.siteName,
        siteLogo: settings.siteLogo || '',
        siteDescription: settings.siteDescription || '',
        primaryColor: settings.primaryColor,
      });
      setStatusForm(settings.unitStatusConfig);

      // Initialize WordPress form from settings
      const wpConfig = (settings as any).wordpressConfig || {};
      setWordpressForm({
        siteUrl: wpConfig.siteUrl || '',
        apiUsername: wpConfig.apiUsername || '',
        apiPassword: wpConfig.apiPassword || '',
        enabled: wpConfig.enabled || false,
        locationsEndpoint: wpConfig.locationsEndpoint || 'wp-json/spaceman/v1/locations',
        unitsEndpoint: wpConfig.unitsEndpoint || 'wp-json/spaceman/v1/units',
      });

      // Initialize HubSpot form from settings
      const hsConfig = (settings as any).hubspotConfig || {};
      setBuilding2Form({
        apiKey: hsConfig.apiKey || '',
        portalId: hsConfig.portalId || '',
        enabled: hsConfig.enabled || false,
      });
    }
  }, [settings, settingsLoading]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchUsersAndRoles();
    }
  }, [isAdmin]);

  // Fetch audit logs when filters or pagination change
  useEffect(() => {
    fetchAuditLogs();
  }, [auditLogPagination.page, auditLogFilters]);

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

  function appendWordPressTestLog(message: string) {
    setWordpressTestLogs((previous) => [...previous, message]);
  }

  function appendWordPressPullLog(message: string) {
    setWordpressPullLogs((previous) => [...previous, message]);
  }

  async function runWordPressEndpointTest(endpoint: string, label: string) {
    appendWordPressTestLog(`Testing ${label} endpoint: ${endpoint}`);

    const response = await fetch('/api/wordpress/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteUrl: wordpressForm.siteUrl,
        apiUsername: wordpressForm.apiUsername,
        apiPassword: wordpressForm.apiPassword,
        endpoint,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `Unable to test ${label} endpoint`);
    }

    if (!payload?.ok) {
      appendWordPressTestLog(`${label} failed with status ${payload?.status ?? 'unknown'}`);
      return false;
    }

    const countText = payload.itemsCount !== null && payload.itemsCount !== undefined
      ? ` (${payload.itemsCount} records)`
      : '';
    appendWordPressTestLog(`${label} OK in ${payload.elapsedMs}ms${countText}`);
    return true;
  }

  async function handleWordPressConnectionTest() {
    setWordpressTestOpen(true);
    setWordpressTestRunning(true);
    setWordpressTestSummary(null);
    setWordpressTestLogs([]);

    try {
      appendWordPressTestLog('Starting WordPress connection test...');

      if (!wordpressForm.siteUrl || !wordpressForm.apiUsername || !wordpressForm.apiPassword) {
        throw new Error('Please provide site URL, API username and API password before testing.');
      }

      appendWordPressTestLog('Credentials and URL are present.');

      const locationsOk = await runWordPressEndpointTest(wordpressForm.locationsEndpoint, 'Locations');
      const unitsOk = await runWordPressEndpointTest(wordpressForm.unitsEndpoint, 'Units');

      if (locationsOk && unitsOk) {
        setWordpressTestSummary({
          ok: true,
          text: 'Connection successful. Both locations and units endpoints responded correctly.',
        });
      } else {
        setWordpressTestSummary({
          ok: false,
          text: 'Connection completed with errors. One or more endpoints failed.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected connection test error';
      appendWordPressTestLog(`Error: ${message}`);
      setWordpressTestSummary({ ok: false, text: message });
    } finally {
      setWordpressTestRunning(false);
      appendWordPressTestLog('Test finished.');
    }
  }

  async function handleWordPressLocationPullAndFill() {
    setWordpressPullOpen(true);
    setWordpressPullRunning(true);
    setWordpressPullSummary(null);
    setWordpressPullLogs([]);

    try {
      appendWordPressPullLog('Starting WordPress locations pull and missing-field sync...');

      if (!wordpressForm.siteUrl || !wordpressForm.apiUsername || !wordpressForm.apiPassword) {
        throw new Error('Please provide site URL, API username and API password before running this sync.');
      }

      const response = await fetch('/api/wordpress/pull-locations', {
        method: 'POST',
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Location pull and sync failed');
      }

      const logs = Array.isArray(payload?.logs) ? payload.logs : [];
      if (logs.length > 0) {
        setWordpressPullLogs((previous) => [...previous, ...logs]);
      }

      const summary = payload?.summary || {};
      setWordpressPullSummary({
        ok: true,
        text: `Pulled ${summary.pulledLocations ?? 0} locations. Matched ${summary.matchedLocations ?? 0}, updated ${summary.updatedLocations ?? 0}, untouched ${summary.unchangedMatchedLocations ?? 0}.`,
      });
      setWordpressMessage({ type: 'success', text: 'WordPress locations pulled and missing fields synced.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected pull and sync error';
      appendWordPressPullLog(`Error: ${message}`);
      setWordpressPullSummary({ ok: false, text: message });
      setWordpressMessage({ type: 'error', text: message });
    } finally {
      setWordpressPullRunning(false);
      appendWordPressPullLog('Sync finished.');
    }
  }

  async function handleHubSpotConnectionTest() {
    setBuilding2Loading(true);
    setBuilding2Message(null);

    try {
      if (!hubspotForm.apiKey || !hubspotForm.portalId) {
        throw new Error('Please provide API Key and Portal ID');
      }

      const response = await fetch('/api/hubspot/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: hubspotForm.apiKey,
          portalId: hubspotForm.portalId,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Connection test failed');
      }

      setBuilding2Message({ type: 'success', text: payload.message || 'HubSpot connection successful!' });
    } catch (error: any) {
      setBuilding2Message({ type: 'error', text: error.message });
    } finally {
      setBuilding2Loading(false);
    }
  }

  async function handleHubSpotSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setBuilding2Loading(true);
    setBuilding2Message(null);

    try {
      if (!hubspotForm.apiKey || !hubspotForm.portalId) {
        throw new Error('API Key and Portal ID are required');
      }

      const response = await fetch('/api/settings/update-hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: hubspotForm.apiKey,
          portalId: hubspotForm.portalId,
          enabled: hubspotForm.enabled,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save configuration');
      }

      // Update settings context
      await updateSettings({
        hubspotConfig: {
          apiKey: hubspotForm.apiKey,
          portalId: hubspotForm.portalId,
          enabled: hubspotForm.enabled,
        },
      });

      setBuilding2Message({ type: 'success', text: 'HubSpot configuration saved successfully!' });
    } catch (error: any) {
      setBuilding2Message({ type: 'error', text: error.message });
    } finally {
      setBuilding2Loading(false);
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
          firstName: profileForm.firstName || null,
          lastName: profileForm.lastName || null,
          phone: profileForm.phone || null,
          mobile: profileForm.mobile || null,
          avatar: profileForm.avatar || null,
          addressLine1: profileForm.addressLine1 || null,
          addressLine2: profileForm.addressLine2 || null,
          townCity: profileForm.townCity || null,
          county: profileForm.county || null,
          postcode: profileForm.postcode || null,
          country: profileForm.country || null,
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

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    setStatusLoading(true);
    setStatusMessage(null);

    try {
      await updateSettings({
        unitStatusConfig: statusForm,
      });
      setStatusMessage({ type: 'success', text: 'Status colors and labels updated successfully!' });
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Failed to update status settings. Please try again.' });
    } finally {
      setStatusLoading(false);
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

  // Activity Logs fetch function
  async function fetchAuditLogs() {
    setAuditLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: auditLogPagination.page.toString(),
        limit: auditLogPagination.limit.toString(),
        ...(auditLogFilters.startDate && { startDate: auditLogFilters.startDate }),
        ...(auditLogFilters.endDate && { endDate: auditLogFilters.endDate }),
        ...(auditLogFilters.action && { action: auditLogFilters.action }),
        ...(auditLogFilters.entityType && { entityType: auditLogFilters.entityType }),
        ...(auditLogFilters.search && { search: auditLogFilters.search }),
      });

      const response = await fetch(`/api/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs);
        setAuditLogPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setAuditLogsLoading(false);
    }
  }

  // HubSpot owners import functions
  async function fetchHubSpotOwners() {
    setHubspotOwnersLoading(true);
    setHubspotImportResult(null);
    try {
      const response = await fetch('/api/hubspot/owners');
      if (response.ok) {
        const data = await response.json();
        setHubspotOwners(data.owners);
      } else {
        const data = await response.json();
        setHubspotImportResult({
          type: 'error',
          message: data.error || 'Failed to fetch HubSpot owners',
        });
      }
    } catch (error) {
      console.error('Failed to fetch HubSpot owners:', error);
      setHubspotImportResult({
        type: 'error',
        message: 'Failed to fetch HubSpot owners',
      });
    } finally {
      setHubspotOwnersLoading(false);
    }
  }

  async function importHubSpotOwners() {
    if (selectedOwnerIds.size === 0) {
      setHubspotImportResult({
        type: 'error',
        message: 'Please select at least one owner to import',
      });
      return;
    }

    setImportingOwners(true);
    setHubspotImportResult(null);
    try {
      const response = await fetch('/api/hubspot/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerIds: Array.from(selectedOwnerIds),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHubspotImportResult({
          type: 'success',
          message: data.message || 'Owners imported successfully',
          results: data.results,
        });

        // Refresh the list after import
        await fetchHubSpotOwners();

        // Refresh users list
        await fetchUsersAndRoles();
      } else {
        const data = await response.json();
        setHubspotImportResult({
          type: 'error',
          message: data.error || 'Failed to import owners',
        });
      }
    } catch (error) {
      console.error('Failed to import HubSpot owners:', error);
      setHubspotImportResult({
        type: 'error',
        message: 'Failed to import HubSpot owners',
      });
    } finally {
      setImportingOwners(false);
    }
  }

  function toggleOwnerSelection(ownerId: string) {
    setSelectedOwnerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ownerId)) {
        newSet.delete(ownerId);
      } else {
        newSet.add(ownerId);
      }
      return newSet;
    });
  }

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
          {isAdmin && (
            <TabsTrigger value="status-colors" className="flex items-center gap-2 rounded-lg">
              <Palette className="h-4 w-4" />
              <span>Status Colors</span>
            </TabsTrigger>
          )}
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
          {isAdmin && (
            <TabsTrigger value="wordpress" className="flex items-center gap-2 rounded-lg">
              <Globe className="h-4 w-4" />
              <span>WordPress</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="hubspot" className="flex items-center gap-2 rounded-lg">
              <Building2 className="h-4 w-4" />
              <span>HubSpot</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="activity-logs" className="flex items-center gap-2 rounded-lg">
              <Clock className="h-4 w-4" />
              <span>Activity Logs</span>
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

                <div className="grid gap-6 lg:grid-cols-3">
                  <div
                    className="rounded-2xl border p-5 space-y-4"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                      Avatar
                    </p>
                    <div className="flex justify-center">
                      {profileForm.avatar ? (
                        <img
                          src={profileForm.avatar}
                          alt="Profile avatar"
                          className="h-24 w-24 rounded-full object-cover border"
                          style={{ borderColor: 'var(--border)' }}
                        />
                      ) : (
                        <div
                          className="h-24 w-24 rounded-full border flex items-center justify-center"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}
                        >
                          <User className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="avatar" className="text-sm font-medium">
                        Avatar URL
                      </label>
                      <Input
                        id="avatar"
                        type="url"
                        value={profileForm.avatar}
                        onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                        placeholder="https://..."
                        className="rounded-xl"
                      />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Paste a direct image URL to set your profile picture.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5 lg:col-span-2">
                    <div
                      className="rounded-2xl border p-5"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                    >
                      <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                        Personal details
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
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

                        <div className="space-y-2">
                          <label htmlFor="firstName" className="text-sm font-medium">
                            First Name
                          </label>
                          <Input
                            id="firstName"
                            type="text"
                            value={profileForm.firstName}
                            onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                            placeholder="Enter your first name"
                            className="rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="lastName" className="text-sm font-medium">
                            Last Name
                          </label>
                          <Input
                            id="lastName"
                            type="text"
                            value={profileForm.lastName}
                            onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                            placeholder="Enter your last name"
                            className="rounded-xl"
                          />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
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
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border p-5"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                    >
                      <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                        Contact numbers
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="phone" className="text-sm font-medium">
                            Phone Number
                          </label>
                          <Input
                            id="phone"
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            placeholder="Enter your phone number"
                            className="rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="mobile" className="text-sm font-medium">
                            Mobile Number
                          </label>
                          <Input
                            id="mobile"
                            type="tel"
                            value={profileForm.mobile}
                            onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                            placeholder="Enter your mobile number"
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                    Address Information
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="addressLine1" className="text-sm font-medium">
                        Address Line 1
                      </label>
                      <Input
                        id="addressLine1"
                        type="text"
                        value={profileForm.addressLine1}
                        onChange={(e) => setProfileForm({ ...profileForm, addressLine1: e.target.value })}
                        placeholder="Street address"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="addressLine2" className="text-sm font-medium">
                        Address Line 2
                      </label>
                      <Input
                        id="addressLine2"
                        type="text"
                        value={profileForm.addressLine2}
                        onChange={(e) => setProfileForm({ ...profileForm, addressLine2: e.target.value })}
                        placeholder="Apartment, suite, etc."
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="townCity" className="text-sm font-medium">
                        Town/City
                      </label>
                      <Input
                        id="townCity"
                        type="text"
                        value={profileForm.townCity}
                        onChange={(e) => setProfileForm({ ...profileForm, townCity: e.target.value })}
                        placeholder="Enter town or city"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="county" className="text-sm font-medium">
                        County/State
                      </label>
                      <Input
                        id="county"
                        type="text"
                        value={profileForm.county}
                        onChange={(e) => setProfileForm({ ...profileForm, county: e.target.value })}
                        placeholder="Enter county or state"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="postcode" className="text-sm font-medium">
                        Postcode/ZIP
                      </label>
                      <Input
                        id="postcode"
                        type="text"
                        value={profileForm.postcode}
                        onChange={(e) => setProfileForm({ ...profileForm, postcode: e.target.value })}
                        placeholder="Enter postcode"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="country" className="text-sm font-medium">
                        Country
                      </label>
                      <Input
                        id="country"
                        type="text"
                        value={profileForm.country}
                        onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                        placeholder="Enter country"
                        className="rounded-xl"
                      />
                    </div>
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

        {isAdmin && (
          <TabsContent value="status-colors">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                       style={{ backgroundColor: `color-mix(in srgb, var(--accent) 16%, var(--surface-0))` }}>
                    <Palette className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <CardTitle>Unit Status Colors</CardTitle>
                    <CardDescription>Define how statuses are named and colored across admin screens.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStatusUpdate} className="space-y-5">
                  {statusMessage && (
                    <div className="rounded-xl border px-4 py-3 text-sm"
                         style={{
                           borderColor: statusMessage.type === 'success'
                             ? 'color-mix(in srgb, var(--success) 40%, var(--border))'
                             : 'color-mix(in srgb, var(--danger) 40%, var(--border))',
                           backgroundColor: statusMessage.type === 'success'
                             ? 'color-mix(in srgb, var(--success) 12%, var(--surface-0))'
                             : 'color-mix(in srgb, var(--danger) 12%, var(--surface-0))',
                           color: statusMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                         }}
                    >
                      {statusMessage.text}
                    </div>
                  )}

                  <div className="space-y-3">
                    {UNIT_STATUSES.map((statusKey) => {
                      const row = statusForm[statusKey];
                      return (
                        <div key={statusKey} className="rounded-xl border p-4"
                             style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                          <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_170px] md:items-center">
                            <div>
                              <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)]">{statusKey}</p>
                            </div>
                            <Input
                              value={row.label}
                              onChange={(e) => setStatusForm((prev) => ({
                                ...prev,
                                [statusKey]: { ...prev[statusKey], label: e.target.value },
                              }))}
                              placeholder="Display label"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={row.color}
                                onChange={(e) => setStatusForm((prev) => ({
                                  ...prev,
                                  [statusKey]: { ...prev[statusKey], color: e.target.value },
                                }))}
                                className="h-10 w-12 rounded-lg border-0"
                              />
                              <Input
                                value={row.color}
                                onChange={(e) => setStatusForm((prev) => ({
                                  ...prev,
                                  [statusKey]: { ...prev[statusKey], color: e.target.value },
                                }))}
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={statusLoading} className="rounded-xl px-6">
                      {statusLoading ? 'Saving...' : 'Save Status Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

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

                {isAdmin && (
                  <Button
                    onClick={() => {
                      setHubspotOwnersOpen(true);
                      fetchHubSpotOwners();
                    }}
                    variant="outline"
                    className="w-full rounded-xl"
                    style={{ borderColor: 'var(--accent)' }}
                  >
                    <Building2 className="mr-2 h-4 w-4" style={{ color: 'var(--accent)' }} />
                    Import from HubSpot Owners
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* HubSpot Owners Import Modal */}
            <Modal
              open={hubspotOwnersOpen}
              onClose={() => setHubspotOwnersOpen(false)}
              title="Import HubSpot Owners"
              description="Select HubSpot owners to import as users. Already imported owners are disabled."
              className="max-w-4xl max-h-[72vh]"
            >
              <div className="space-y-4">

                {hubspotImportResult && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border"
                       style={{
                         backgroundColor: hubspotImportResult.type === 'success'
                           ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                           : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                         borderColor: hubspotImportResult.type === 'success'
                           ? 'color-mix(in srgb, var(--success) 40%, var(--border))'
                           : 'color-mix(in srgb, var(--danger) 40%, var(--border))',
                       }}>
                    {hubspotImportResult.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: 'var(--success)' }} />
                    ) : (
                      <XCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--danger)' }} />
                    )}
                    <div>
                      <p className="font-medium" style={{
                        color: hubspotImportResult.type === 'success' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {hubspotImportResult.type === 'success' ? 'Success' : 'Error'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {hubspotImportResult.message}
                      </p>
                      {hubspotImportResult.results && (
                        <div className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <p>✓ {hubspotImportResult.results.success} imported</p>
                          <p>⊘ {hubspotImportResult.results.skipped} skipped</p>
                          {hubspotImportResult.results.errors > 0 && (
                            <p>✗ {hubspotImportResult.results.errors} errors</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {hubspotOwnersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
                  </div>
                ) : (
                  <>
                    {hubspotOwners.length === 0 ? (
                      <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>No HubSpot owners found</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--text-muted)' }}>
                            {hubspotOwners.filter((o) => !o.imported).length} available to import
                          </span>
                          <Button
                            onClick={() => setSelectedOwnerIds(
                              new Set(hubspotOwners.filter((o) => !o.imported).map((o) => o.id))
                            )}
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                          >
                            Select All Available
                          </Button>
                        </div>

                        <div className="max-h-72 overflow-y-auto rounded-xl border" style={{ backgroundColor: 'var(--surface-0)' }}>
                          {hubspotOwners.map((owner) => (
                            <div
                              key={owner.id}
                              className={`flex items-center gap-3 p-4 border-b last:border-b-0 ${
                                owner.imported ? 'opacity-50' : ''
                              }`}
                              style={{ borderColor: 'var(--border)' }}
                            >
                              <input
                                type="checkbox"
                                id={`owner-${owner.id}`}
                                checked={selectedOwnerIds.has(owner.id)}
                                disabled={owner.imported || importingOwners}
                                onChange={() => toggleOwnerSelection(owner.id)}
                                className="h-4 w-4 rounded"
                              />
                              <label
                                htmlFor={`owner-${owner.id}`}
                                className={`flex-1 cursor-pointer ${owner.imported ? 'line-through' : ''}`}
                              >
                                <div className="font-medium">{owner.fullName}</div>
                                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {owner.email}
                                </div>
                              </label>
                              {owner.imported && (
                                <Badge variant="secondary" className="text-xs">
                                  Imported
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>

                        {hubspotImportResult?.results?.details && hubspotImportResult.results.details.length > 0 && (
                          <div className="max-h-48 overflow-y-auto rounded-lg border p-3 text-xs"
                               style={{ backgroundColor: 'var(--surface-0)', borderColor: 'var(--border)' }}>
                            <p className="font-semibold mb-2">Import Details:</p>
                            {hubspotImportResult.results.details.map((detail: any, idx: number) => (
                              <div key={idx} className="flex gap-2 mb-1">
                                <span style={{
                                  color: detail.status === 'success' ? 'var(--success)' :
                                         detail.status === 'error' ? 'var(--danger)' : 'var(--text-muted)'
                                }}>
                                  {detail.status === 'success' ? '✓' :
                                   detail.status === 'error' ? '✗' : '⊘'}
                                </span>
                                <span>{detail.email || detail.ownerId}</span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  {detail.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    onClick={() => setHubspotOwnersOpen(false)}
                    variant="outline"
                    className="rounded-xl"
                    disabled={importingOwners}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={importHubSpotOwners}
                    disabled={selectedOwnerIds.size === 0 || importingOwners}
                    className="rounded-xl"
                  >
                    {importingOwners ? 'Importing...' : `Import ${selectedOwnerIds.size} Owner${selectedOwnerIds.size !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </Modal>
          </TabsContent>

        {(isAdmin || canManageRoles) && (
          <TabsContent value="roles">
            <RoleDesigner />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="wordpress" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                       style={{ backgroundColor: `color-mix(in srgb, #3b82f6 16%, var(--surface-0))` }}>
                    <Globe className="h-4 w-4" style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <CardTitle>WordPress API Configuration</CardTitle>
                    <CardDescription>Configure connection to your WordPress site with the Spaceman plugin</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setWordpressLoading(true);
                  setWordpressMessage(null);

                  try {
                    const wordpressConfig = {
                      siteUrl: wordpressForm.siteUrl,
                      apiUsername: wordpressForm.apiUsername,
                      apiPassword: wordpressForm.apiPassword,
                      enabled: wordpressForm.enabled,
                      locationsEndpoint: wordpressForm.locationsEndpoint,
                      unitsEndpoint: wordpressForm.unitsEndpoint,
                    };

                    await updateSettings({
                      wordpressConfig
                    });

                    setWordpressMessage({ type: 'success', text: 'WordPress configuration saved successfully!' });
                  } catch (error) {
                    setWordpressMessage({ type: 'error', text: 'Failed to save WordPress configuration.' });
                  } finally {
                    setWordpressLoading(false);
                  }
                }} className="space-y-6">
                  {wordpressMessage && (
                    <div className="flex items-start gap-3 p-4 rounded-xl border"
                         style={{
                           backgroundColor: wordpressMessage.type === 'success'
                             ? 'color-mix(in srgb, var(--success) 16%, var(--surface-0))'
                             : 'color-mix(in srgb, var(--danger) 16%, var(--surface-0))',
                           borderColor: wordpressMessage.type === 'success'
                             ? 'color-mix(in srgb, var(--success) 40%, var(--border))'
                             : 'color-mix(in srgb, var(--danger) 40%, var(--border))',
                         }}>
                      {wordpressMessage.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: 'var(--success)' }} />
                      ) : (
                        <XCircle className="h-5 w-5 mt-0.5" style={{ color: 'var(--danger)' }} />
                      )}
                      <div>
                        <p className="font-medium" style={{
                          color: wordpressMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {wordpressMessage.type === 'success' ? 'Success' : 'Error'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {wordpressMessage.text}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="siteUrl" className="flex items-center gap-2 text-sm font-medium">
                        <Globe className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        WordPress Site URL
                      </label>
                      <Input
                        id="siteUrl"
                        type="url"
                        value={wordpressForm.siteUrl}
                        onChange={(e) => setWordpressForm({ ...wordpressForm, siteUrl: e.target.value })}
                        placeholder="https://mysite.com"
                        className="rounded-xl"
                      />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Enter your WordPress site URL without trailing slash
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="apiUsername" className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        API Username
                      </label>
                      <Input
                        id="apiUsername"
                        type="text"
                        value={wordpressForm.apiUsername}
                        onChange={(e) => setWordpressForm({ ...wordpressForm, apiUsername: e.target.value })}
                        placeholder="wp_api_user"
                        className="rounded-xl"
                      />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        WordPress username for Basic Authentication
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="apiPassword" className="flex items-center gap-2 text-sm font-medium">
                      <Key className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      API Password / Application Password
                    </label>
                    <Input
                      id="apiPassword"
                      type="password"
                      value={wordpressForm.apiPassword}
                      onChange={(e) => setWordpressForm({ ...wordpressForm, apiPassword: e.target.value })}
                      placeholder="••••••••"
                      className="rounded-xl"
                    />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Use WordPress Application Passwords for better security
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="locationsEndpoint" className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        Locations Endpoint
                      </label>
                      <Input
                        id="locationsEndpoint"
                        type="text"
                        value={wordpressForm.locationsEndpoint}
                        onChange={(e) => setWordpressForm({ ...wordpressForm, locationsEndpoint: e.target.value })}
                        placeholder="wp-json/spaceman/v1/locations"
                        className="rounded-xl"
                      />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Custom endpoint path for locations post type
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="unitsEndpoint" className="flex items-center gap-2 text-sm font-medium">
                        <Shield className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        Units Endpoint
                      </label>
                      <Input
                        id="unitsEndpoint"
                        type="text"
                        value={wordpressForm.unitsEndpoint}
                        onChange={(e) => setWordpressForm({ ...wordpressForm, unitsEndpoint: e.target.value })}
                        placeholder="wp-json/spaceman/v1/units"
                        className="rounded-xl"
                      />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Custom endpoint path for units post type
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl border"
                       style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={wordpressForm.enabled}
                      onChange={(e) => setWordpressForm({ ...wordpressForm, enabled: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <div>
                      <label htmlFor="enabled" className="text-sm font-medium cursor-pointer">
                        Enable WordPress Integration
                      </label>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Enable read-only pull from WordPress (push sync will be added later)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={wordpressLoading} className="rounded-xl px-6">
                      {wordpressLoading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleWordPressConnectionTest}
                      className="rounded-xl"
                    >
                      Test Connection
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleWordPressLocationPullAndFill}
                      disabled={wordpressPullRunning}
                      className="rounded-xl"
                    >
                      {wordpressPullRunning ? 'Syncing...' : 'Pull Locations + Fill Missing Fields'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Setup Instructions</CardTitle>
                <CardDescription>Follow these steps to configure WordPress integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-semibold">1.</span>
                    <div>
                      <p className="font-medium">Install the Spaceman plugin on your WordPress site</p>
                      <p className="text-muted-foreground">Upload and activate the plugin through WordPress admin</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold">2.</span>
                    <div>
                      <p className="font-medium">Create API credentials in WordPress</p>
                      <p className="text-muted-foreground">Go to Users → Profile → Application Passwords and create a new password</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold">3.</span>
                    <div>
                      <p className="font-medium">Enter your WordPress site URL above</p>
                      <p className="text-muted-foreground">Add the URL without trailing slash (e.g., https://mysite.com)</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold">4.</span>
                    <div>
                      <p className="font-medium">Configure custom endpoints for your post types</p>
                      <p className="text-muted-foreground">If using custom post types, update the endpoint paths accordingly</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold">5.</span>
                    <div>
                      <p className="font-medium">Enable the integration</p>
                      <p className="text-muted-foreground">Toggle the switch to enable read-only pull mode</p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Modal
              open={wordpressTestOpen}
              onClose={() => {
                if (!wordpressTestRunning) setWordpressTestOpen(false);
              }}
              title="WordPress Connection Test"
              description="Live status for endpoint connectivity checks"
              className="max-w-2xl"
            >
              <div className="space-y-4">
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Site: {wordpressForm.siteUrl || 'Not set'}
                  </p>
                </div>

                {wordpressTestSummary && (
                  <div
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: wordpressTestSummary.ok
                        ? 'color-mix(in srgb, var(--success) 45%, var(--border))'
                        : 'color-mix(in srgb, var(--danger) 45%, var(--border))',
                      backgroundColor: wordpressTestSummary.ok
                        ? 'color-mix(in srgb, var(--success) 12%, var(--surface-0))'
                        : 'color-mix(in srgb, var(--danger) 12%, var(--surface-0))',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: wordpressTestSummary.ok ? 'var(--success)' : 'var(--danger)' }}>
                      {wordpressTestSummary.text}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border p-3 h-64 overflow-y-auto text-sm space-y-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
                  {wordpressTestLogs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No logs yet.</p>
                  ) : (
                    wordpressTestLogs.map((log, index) => (
                      <p key={index} style={{ color: 'var(--text-strong)' }}>
                        {log}
                      </p>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWordpressTestOpen(false)}
                    disabled={wordpressTestRunning}
                  >
                    Close
                  </Button>
                  <Button type="button" onClick={handleWordPressConnectionTest} disabled={wordpressTestRunning}>
                    {wordpressTestRunning ? 'Testing...' : 'Run Again'}
                  </Button>
                </div>
              </div>
            </Modal>

            <Modal
              open={wordpressPullOpen}
              onClose={() => {
                if (!wordpressPullRunning) setWordpressPullOpen(false);
              }}
              title="WordPress Location Pull & Fill"
              description="Pull locations from WordPress and fill only missing CMS location fields"
              className="max-w-2xl"
            >
              <div className="space-y-4">
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Site: {wordpressForm.siteUrl || 'Not set'}
                  </p>
                </div>

                {wordpressPullSummary && (
                  <div
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: wordpressPullSummary.ok
                        ? 'color-mix(in srgb, var(--success) 45%, var(--border))'
                        : 'color-mix(in srgb, var(--danger) 45%, var(--border))',
                      backgroundColor: wordpressPullSummary.ok
                        ? 'color-mix(in srgb, var(--success) 12%, var(--surface-0))'
                        : 'color-mix(in srgb, var(--danger) 12%, var(--surface-0))',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: wordpressPullSummary.ok ? 'var(--success)' : 'var(--danger)' }}>
                      {wordpressPullSummary.text}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border p-3 h-64 overflow-y-auto text-sm space-y-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
                  {wordpressPullLogs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No logs yet.</p>
                  ) : (
                    wordpressPullLogs.map((log, index) => (
                      <p key={index} style={{ color: 'var(--text-strong)' }}>
                        {log}
                      </p>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWordpressPullOpen(false)}
                    disabled={wordpressPullRunning}
                  >
                    Close
                  </Button>
                  <Button type="button" onClick={handleWordPressLocationPullAndFill} disabled={wordpressPullRunning}>
                    {wordpressPullRunning ? 'Syncing...' : 'Run Again'}
                  </Button>
                </div>
              </div>
            </Modal>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="hubspot" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>HubSpot CRM Configuration</CardTitle>
                <CardDescription>Configure connection to your HubSpot account to sync deals</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleHubSpotSaveConfig} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="hubspot-api-key" className="text-sm font-medium">
                      HubSpot API Key
                    </label>
                    <Input
                      id="hubspot-api-key"
                      type="password"
                      value={hubspotForm.apiKey}
                      onChange={(e) => setBuilding2Form({ ...hubspotForm, apiKey: e.target.value })}
                      placeholder="pat-eu1-..."
                      disabled={hubspotLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your HubSpot Personal Access Token (PAT)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="hubspot-portal-id" className="text-sm font-medium">
                      HubSpot Portal ID
                    </label>
                    <Input
                      id="hubspot-portal-id"
                      type="text"
                      value={hubspotForm.portalId}
                      onChange={(e) => setBuilding2Form({ ...hubspotForm, portalId: e.target.value })}
                      placeholder="144405758"
                      disabled={hubspotLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your HubSpot account Portal ID
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="hubspot-enabled"
                      type="checkbox"
                      checked={hubspotForm.enabled}
                      onChange={(e) => setBuilding2Form({ ...hubspotForm, enabled: e.target.checked })}
                      disabled={hubspotLoading}
                      className="h-4 w-4 rounded"
                    />
                    <label htmlFor="hubspot-enabled" className="text-sm font-medium">
                      Enable HubSpot Integration
                    </label>
                  </div>

                  {hubspotMessage && (
                    <div className={`p-3 rounded-lg ${hubspotMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {hubspotMessage.text}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={hubspotLoading}
                      className="flex-1"
                    >
                      {hubspotLoading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleHubSpotConnectionTest}
                      disabled={hubspotLoading || !hubspotForm.apiKey || !hubspotForm.portalId}
                    >
                      Test Connection
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Setup Instructions</CardTitle>
                <CardDescription>Follow these steps to configure HubSpot integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="font-medium">Create a HubSpot Personal Access Token</p>
                  <p className="text-sm text-muted-foreground">
                    Go to HubSpot Settings → Integrations → API Key → Create Personal Access Token
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Find your Portal ID</p>
                  <p className="text-sm text-muted-foreground">
                    Your Portal ID is shown in your HubSpot account URL or in Settings → Account Details
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Enter credentials above</p>
                  <p className="text-sm text-muted-foreground">
                    Paste your API Key and Portal ID, then test the connection before saving
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Activity Logs Tab */}
        {isAdmin && (
          <TabsContent value="activity-logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--accent) 16%, var(--surface-0))`,
                      }}
                    >
                      <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <CardTitle>Activity Logs</CardTitle>
                      <CardDescription>Track all system actions and changes</CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => fetchAuditLogs()}
                    disabled={auditLogsLoading}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${auditLogsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={auditLogFilters.startDate}
                      onChange={(e) =>
                        setAuditLogFilters((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={auditLogFilters.endDate}
                      onChange={(e) =>
                        setAuditLogFilters((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Action</label>
                    <select
                      value={auditLogFilters.action}
                      onChange={(e) =>
                        setAuditLogFilters((prev) => ({ ...prev, action: e.target.value }))
                      }
                      className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                      <option value="LOGIN">Login</option>
                      <option value="LOGOUT">Logout</option>
                      <option value="EXPORT">Export</option>
                      <option value="IMPORT">Import</option>
                      <option value="SYNC">Sync</option>
                      <option value="SETTINGS_UPDATE">Settings Update</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Entity Type</label>
                    <select
                      value={auditLogFilters.entityType}
                      onChange={(e) =>
                        setAuditLogFilters((prev) => ({ ...prev, entityType: e.target.value }))
                      }
                      className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">All Entities</option>
                      <option value="USER">User</option>
                      <option value="CLIENT">Client</option>
                      <option value="LOCATION">Location</option>
                      <option value="UNIT">Unit</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="ROLE">Role</option>
                      <option value="SETTINGS">Settings</option>
                      <option value="HUBSPOT">HubSpot</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <Input
                      type="text"
                      placeholder="Search descriptions..."
                      value={auditLogFilters.search}
                      onChange={(e) =>
                        setAuditLogFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Results count */}
                <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span>
                    Showing {auditLogs.length} of {auditLogPagination.total} logs
                  </span>
                </div>

                {/* Logs table */}
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)' }}>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          Entity
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogsLoading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : auditLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-8"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            No activity logs found matching your filters
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr
                            key={log.id}
                            style={{ borderBottom: '1px solid var(--border)' }}
                          >
                            <td className="px-4 py-3 text-sm">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium">{log.user.username || log.user.email}</div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {log.user.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary">{log.action}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{log.entityType}</span>
                              {log.entityId && (
                                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                                  ({log.entityId.slice(0, 8)}...)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">{log.description}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {auditLogPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Page {auditLogPagination.page} of {auditLogPagination.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          setAuditLogPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                        }
                        disabled={auditLogPagination.page === 1 || auditLogsLoading}
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() =>
                          setAuditLogPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                        }
                        disabled={
                          auditLogPagination.page >= auditLogPagination.totalPages ||
                          auditLogsLoading
                        }
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
