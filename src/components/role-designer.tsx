'use client';

import { useEffect, useMemo, useState } from 'react';
import { Shield, Plus, Save, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type RoleRecord = {
  id: number;
  name: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  permissions: unknown;
  priority: number;
  active: boolean;
  _count?: {
    users: number;
  };
};

type PermissionMap = Record<string, boolean>;

type RoleDraft = {
  id: number | null;
  name: string;
  label: string;
  description: string;
  priority: number;
  active: boolean;
  permissions: PermissionMap;
  isSystem: boolean;
};

const PERMISSION_GROUPS = [
  {
    title: 'Menus',
    description: 'Controls visibility of sections in the sidebar.',
    items: [
      { key: 'menus.dashboard', label: 'Dashboard' },
      { key: 'menus.users', label: 'Users' },
      { key: 'menus.locations', label: 'Locations' },
      { key: 'menus.units', label: 'Units' },
      { key: 'menus.clients', label: 'Clients' },
      { key: 'menus.contracts', label: 'Contracts' },
      { key: 'menus.settings', label: 'Settings' },
    ],
  },
  {
    title: 'Actions',
    description: 'Controls what role can modify.',
    items: [
      { key: 'actions.users.manage', label: 'Manage users' },
      { key: 'actions.roles.manage', label: 'Manage roles' },
      { key: 'actions.locations.manage', label: 'Manage locations' },
      { key: 'actions.units.manage', label: 'Manage units' },
      { key: 'actions.clients.manage', label: 'Manage clients' },
      { key: 'actions.contracts.manage', label: 'Manage contracts' },
      { key: 'actions.settings.branding', label: 'Change branding' },
      { key: 'actions.settings.security', label: 'Manage security settings' },
    ],
  },
] as const;

const DEFAULT_ROLE_DRAFT: RoleDraft = {
  id: null,
  name: '',
  label: '',
  description: '',
  priority: 1,
  active: true,
  permissions: {
    'menus.dashboard': true,
    'menus.settings': true,
  },
  isSystem: false,
};

function flattenPermissions(input: unknown, prefix = ''): PermissionMap {
  if (!input || typeof input !== 'object') return {};

  const source = input as Record<string, unknown>;
  const result: PermissionMap = {};

  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'boolean') {
      result[nextKey] = value;
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenPermissions(value, nextKey));
    }
  }

  return result;
}

function mapRoleToDraft(role: RoleRecord): RoleDraft {
  return {
    id: role.id,
    name: role.name,
    label: role.label,
    description: role.description || '',
    priority: role.priority,
    active: role.active,
    permissions: flattenPermissions(role.permissions),
    isSystem: role.isSystem,
  };
}

export default function RoleDesigner() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RoleDraft>(DEFAULT_ROLE_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customPermissionKey, setCustomPermissionKey] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  const knownPermissionKeys = useMemo(() => {
    const baseKeys = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key));
    const roleKeys = roles.flatMap((role) => Object.keys(flattenPermissions(role.permissions)));
    const draftKeys = Object.keys(draft.permissions);
    return [...new Set([...baseKeys, ...roleKeys, ...draftKeys])].sort();
  }, [roles, draft.permissions]);

  async function fetchRoles() {
    setLoading(true);
    try {
      const response = await fetch('/api/roles');
      if (!response.ok) {
        setMessage({ type: 'error', text: 'Failed to load roles.' });
        return;
      }

      const payload = (await response.json()) as RoleRecord[];
      setRoles(payload);

      if (!selectedRoleId && payload.length > 0) {
        setSelectedRoleId(payload[0].id);
        setDraft(mapRoleToDraft(payload[0]));
      } else if (selectedRoleId) {
        const matched = payload.find((role) => role.id === selectedRoleId);
        if (matched) {
          setDraft(mapRoleToDraft(matched));
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load roles.' });
    } finally {
      setLoading(false);
    }
  }

  function selectRole(role: RoleRecord) {
    setSelectedRoleId(role.id);
    setDraft(mapRoleToDraft(role));
    setMessage(null);
  }

  function startNewRole() {
    setSelectedRoleId(null);
    setDraft({ ...DEFAULT_ROLE_DRAFT });
    setMessage(null);
  }

  function togglePermission(key: string, value: boolean) {
    setDraft((previous) => ({
      ...previous,
      permissions: {
        ...previous.permissions,
        [key]: value,
      },
    }));
  }

  function addCustomPermission() {
    const key = customPermissionKey.trim();
    if (!key) return;

    togglePermission(key, true);
    setCustomPermissionKey('');
  }

  async function saveRole() {
    const normalizedName = draft.name.trim().toUpperCase();
    const label = draft.label.trim();

    if (!normalizedName || !label) {
      setMessage({ type: 'error', text: 'Role name and label are required.' });
      return;
    }

    if (draft.isSystem && draft.id) {
      setMessage({ type: 'error', text: 'System roles cannot be modified.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      name: normalizedName,
      label,
      description: draft.description.trim() || null,
      priority: draft.priority,
      active: draft.active,
      permissions: draft.permissions,
    };

    try {
      const response = await fetch(
        draft.id ? `/api/roles/${draft.id}` : '/api/roles',
        {
          method: draft.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Failed to save role.' });
        return;
      }

      await fetchRoles();
      if (!draft.id && result.id) {
        setSelectedRoleId(result.id);
      }
      setMessage({ type: 'success', text: draft.id ? 'Role updated.' : 'Role created.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save role.' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole() {
    if (!draft.id) return;
    if (draft.isSystem) {
      setMessage({ type: 'error', text: 'System roles cannot be deleted.' });
      return;
    }

    const proceed = window.confirm('Delete this role? This cannot be undone.');
    if (!proceed) return;

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/roles/${draft.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Failed to delete role.' });
        return;
      }

      setMessage({ type: 'success', text: 'Role deleted.' });
      setSelectedRoleId(null);
      setDraft({ ...DEFAULT_ROLE_DRAFT });
      await fetchRoles();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete role.' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Designer
            </CardTitle>
            <CardDescription>Create roles and configure menus/actions each role can access.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={fetchRoles} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {message && (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: message.type === 'success' ? 'color-mix(in srgb, var(--success) 40%, var(--border))' : 'color-mix(in srgb, var(--danger) 40%, var(--border))',
              backgroundColor: message.type === 'success' ? 'color-mix(in srgb, var(--success) 12%, var(--surface-0))' : 'color-mix(in srgb, var(--danger) 12%, var(--surface-0))',
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
            <Button type="button" onClick={startNewRole} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>

            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => selectRole(role)}
                    className="w-full rounded-xl border p-3 text-left transition"
                    style={{
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: isSelected ? 'color-mix(in srgb, var(--accent) 10%, var(--surface-0))' : 'var(--surface-0)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{role.label}</p>
                      <Badge variant="secondary">{role.name}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{role.description || 'No description'}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span>Priority: {role.priority}</span>
                      <span>Users: {role._count?.users ?? 0}</span>
                      {!role.active && <span>Inactive</span>}
                      {role.isSystem && <span>System</span>}
                    </div>
                  </button>
                );
              })}

              {!loading && roles.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--text-muted)]">No roles found.</p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={draft.name}
                onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value.toUpperCase() }))}
                placeholder="Role key (e.g. MANAGER)"
                disabled={draft.isSystem}
              />
              <Input
                value={draft.label}
                onChange={(event) => setDraft((previous) => ({ ...previous, label: event.target.value }))}
                placeholder="Role label"
                disabled={draft.isSystem}
              />
              <Input
                value={draft.description}
                onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                placeholder="Description"
                disabled={draft.isSystem}
              />
              <Input
                type="number"
                value={draft.priority}
                onChange={(event) => setDraft((previous) => ({ ...previous, priority: Number(event.target.value) || 0 }))}
                placeholder="Priority"
                disabled={draft.isSystem}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft((previous) => ({ ...previous, active: event.target.checked }))}
                disabled={draft.isSystem}
              />
              Role active
            </label>

            {draft.isSystem && (
              <p className="rounded-lg border px-3 py-2 text-xs text-[var(--warning)]" style={{ borderColor: 'color-mix(in srgb, var(--warning) 40%, var(--border))' }}>
                System roles are read-only.
              </p>
            )}

            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-semibold">{group.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{group.description}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {group.items.map((item) => (
                      <label key={item.key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.permissions[item.key])}
                          onChange={(event) => togglePermission(item.key, event.target.checked)}
                          disabled={draft.isSystem}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="font-semibold">Custom Permissions</p>
                <p className="text-xs text-[var(--text-muted)]">Add keys for new functionality, then toggle them per role.</p>

                <div className="mt-3 flex gap-2">
                  <Input
                    value={customPermissionKey}
                    onChange={(event) => setCustomPermissionKey(event.target.value)}
                    placeholder="e.g. actions.reports.export"
                    disabled={draft.isSystem}
                  />
                  <Button type="button" variant="outline" onClick={addCustomPermission} disabled={draft.isSystem || !customPermissionKey.trim()}>
                    Add
                  </Button>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {knownPermissionKeys
                    .filter((key) => !PERMISSION_GROUPS.some((group) => group.items.some((item) => item.key === key)))
                    .map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.permissions[key])}
                          onChange={(event) => togglePermission(key, event.target.checked)}
                          disabled={draft.isSystem}
                        />
                        {key}
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={saveRole} disabled={saving || loading}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : draft.id ? 'Update Role' : 'Create Role'}
              </Button>

              {draft.id && (
                <Button type="button" variant="outline" onClick={deleteRole} disabled={deleting || draft.isSystem}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete Role'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
