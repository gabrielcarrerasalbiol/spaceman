import { auth } from '@/lib/auth';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Activity, Building2, FileSignature, MapPin, UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_STATUS_CONFIG, normalizeStatusConfig, type StatusConfig } from '@/lib/status-config';

const STATUS_ORDER = ['OCCUPIED', 'AVAILABLE', 'RESERVED', 'MAINTENANCE', 'INACTIVE'] as const;

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'short' });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

type LocationItem = {
  id: string;
  name: string;
  active: boolean;
};

type UnitItem = {
  id: string;
  locationId: string;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
};

type ContractItem = {
  id: string;
  locationId: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED' | 'CANCELLED';
  createdAt: Date;
  monthlyRate: number | null;
  weeklyRate: number | null;
};

function buildScope(units: UnitItem[], contracts: ContractItem[], statusConfig: StatusConfig) {
  const statusCounts = {
    OCCUPIED: 0,
    AVAILABLE: 0,
    RESERVED: 0,
    MAINTENANCE: 0,
    INACTIVE: 0,
  };

  for (const unit of units) {
    statusCounts[unit.status] += 1;
  }

  const totalUnits = units.length;
  const occupiedUnits = statusCounts.OCCUPIED;
  const availableUnits = statusCounts.AVAILABLE;
  const reservedUnits = statusCounts.RESERVED;
  const maintenanceUnits = statusCounts.MAINTENANCE;
  const inactiveUnits = statusCounts.INACTIVE;

  const activeOperationalUnits = totalUnits - inactiveUnits;
  const utilizationRate = activeOperationalUnits > 0
    ? ((occupiedUnits + reservedUnits) / activeOperationalUnits) * 100
    : 0;
  const occupancyRate = activeOperationalUnits > 0
    ? (occupiedUnits / activeOperationalUnits) * 100
    : 0;

  const sliceValues = {
    OCCUPIED: occupiedUnits,
    AVAILABLE: availableUnits,
    RESERVED: reservedUnits,
    MAINTENANCE: maintenanceUnits,
    INACTIVE: inactiveUnits,
  };

  const occupancySlices = STATUS_ORDER.map((status) => ({
    label: statusConfig[status].label,
    value: sliceValues[status],
    color: statusConfig[status].color,
  })).filter((slice) => slice.value > 0);

  const donutRadius = 56;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let offset = 0;
  const donutSegments = occupancySlices.map((slice) => {
    const portion = totalUnits > 0 ? slice.value / totalUnits : 0;
    const length = portion * donutCircumference;
    const segment = {
      ...slice,
      dasharray: `${length} ${Math.max(donutCircumference - length, 0)}`,
      dashoffset: -offset,
      percent: portion * 100,
    };
    offset += length;
    return segment;
  });

  const now = new Date();
  const monthlyContracts = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const count = contracts.filter((contract) => {
      const contractDate = new Date(contract.createdAt);
      return contractDate.getMonth() === month && contractDate.getFullYear() === year;
    }).length;

    return {
      key: `${year}-${month}`,
      label: monthLabel(date),
      count,
    };
  });

  const maxMonthlyContracts = Math.max(1, ...monthlyContracts.map((item) => item.count));
  const activeContracts = contracts.filter((contract) => contract.status === 'ACTIVE').length;
  const pendingContracts = contracts.filter((contract) => contract.status === 'PENDING_SIGNATURE').length;

  const monthlyRecurringRevenue = contracts
    .filter((contract) => contract.status === 'ACTIVE')
    .reduce((total, contract) => {
      if (contract.monthlyRate !== null) return total + Number(contract.monthlyRate);
      if (contract.weeklyRate !== null) return total + (Number(contract.weeklyRate) * 52) / 12;
      return total;
    }, 0);

  const weeklyContractRevenue = contracts
    .filter((contract) => contract.status === 'ACTIVE')
    .reduce((total, contract) => total + Number(contract.weeklyRate || 0), 0);

  return {
    statusCounts,
    totalUnits,
    occupiedUnits,
    availableUnits,
    reservedUnits,
    maintenanceUnits,
    inactiveUnits,
    utilizationRate,
    occupancyRate,
    donutSegments,
    monthlyContracts,
    maxMonthlyContracts,
    activeContracts,
    pendingContracts,
    monthlyRecurringRevenue,
    weeklyContractRevenue,
    annualRunRate: monthlyRecurringRevenue * 12,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string; locationId?: string };
}) {
  const session = await auth();
  const activeTab = searchParams?.tab === 'operations' ? 'operations' : 'main';
  const [locations, units, contracts, clients, settingsRow] = await Promise.all([
    prisma.location.findMany({
      select: {
        id: true,
        name: true,
        active: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.unit.findMany({
      select: {
        id: true,
        locationId: true,
        status: true,
      },
    }),
    prisma.contract.findMany({
      select: {
        id: true,
        locationId: true,
        status: true,
        createdAt: true,
        monthlyRate: true,
        weeklyRate: true,
      },
    }),
    prisma.client.count(),
    prisma.settings.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { unitStatusConfig: true },
    }),
  ]);

  const settingsConfig = normalizeStatusConfig(settingsRow?.unitStatusConfig ?? DEFAULT_STATUS_CONFIG);
  const occupiedLabel = settingsConfig.OCCUPIED.label;
  const maintenanceLabel = settingsConfig.MAINTENANCE.label;

  const selectedLocationId = searchParams?.locationId || locations[0]?.id || '';
  const selectedLocation = locations.find((location) => location.id === selectedLocationId) || null;

  const allScope = buildScope(units as UnitItem[], contracts as ContractItem[], settingsConfig);
  const operationsUnits = selectedLocation
    ? units.filter((unit) => unit.locationId === selectedLocation.id)
    : [];
  const operationsContracts = selectedLocation
    ? contracts.filter((contract) => contract.locationId === selectedLocation.id)
    : [];
  const operationsScope = buildScope(operationsUnits as UnitItem[], operationsContracts as ContractItem[], settingsConfig);

  const locationStats = locations
    .map((location) => {
      const locationUnits = units.filter((unit) => unit.locationId === location.id);
      const total = locationUnits.length;
      const occupied = locationUnits.filter((unit) => unit.status === 'OCCUPIED').length;
      const reserved = locationUnits.filter((unit) => unit.status === 'RESERVED').length;
      const utilization = total > 0 ? ((occupied + reserved) / total) * 100 : 0;

      return {
        id: location.id,
        name: location.name,
        active: location.active,
        total,
        occupied,
        reserved,
        utilization,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const maxLocationUnits = Math.max(1, ...locationStats.map((item) => item.total));

  const kpis = [
    {
      label: 'Locations',
      value: locations.length,
      subtitle: `${locations.filter((location) => location.active).length} active`,
      icon: MapPin,
      color: '#3b82f6',
    },
    {
      label: 'Units',
      value: allScope.totalUnits,
      subtitle: `${allScope.occupiedUnits} ${occupiedLabel.toLowerCase()}`,
      icon: Building2,
      color: '#22c55e',
    },
    {
      label: 'Clients',
      value: clients,
      subtitle: `${allScope.activeContracts} active contracts`,
      icon: UserRound,
      color: '#f59e0b',
    },
    {
      label: 'Contracts',
      value: contracts.length,
      subtitle: `${allScope.pendingContracts} pending signature`,
      icon: FileSignature,
      color: '#ef4444',
    },
  ];

  return (
    <div className="space-y-2">
      <section className="dashboard-fade-in relative overflow-hidden rounded-2xl border px-4 py-2" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: '#b32b39' }}>
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15), transparent 65%)' }} />
        <div className="relative grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Dashboard</h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">Operations Overview</p>
          </div>

          <div className="rounded-xl border px-3 py-2 md:min-w-[290px]" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
            <p className="text-xs text-gray-700">Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', backgroundColor: '#b32b39' }}>
                All-Site Occupancy {formatPercent(allScope.occupancyRate)}
              </span>
              <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', backgroundColor: '#b32b39' }}>
                All-Site Utilization {formatPercent(allScope.utilizationRate)}
              </span>
              <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', backgroundColor: '#b32b39' }}>
                Role {(session?.user as any)?.role || 'USER'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-rise-up rounded-2xl border px-2.5 pt-1.5 pb-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
        <div className="flex gap-1.5 border-b" style={{ borderColor: 'var(--border)' }} role="tablist" aria-label="Dashboard view tabs">
          <Link
            href="/dashboard?tab=main"
            role="tab"
            aria-selected={activeTab === 'main'}
            className="rounded-t-lg px-3 py-2 text-sm font-semibold transition"
            style={{
              borderBottom: activeTab === 'main' ? '2px solid var(--accent)' : '2px solid transparent',
              backgroundColor: activeTab === 'main' ? 'color-mix(in srgb, var(--accent) 10%, var(--surface-0))' : 'transparent',
              color: activeTab === 'main' ? 'var(--accent)' : 'var(--text-strong)',
            }}
          >
            Main Dashboard (All Sites)
          </Link>
          <Link
            href={`/dashboard?tab=operations${selectedLocationId ? `&locationId=${selectedLocationId}` : ''}`}
            role="tab"
            aria-selected={activeTab === 'operations'}
            className="rounded-t-lg px-3 py-2 text-sm font-semibold transition"
            style={{
              borderBottom: activeTab === 'operations' ? '2px solid var(--accent)' : '2px solid transparent',
              backgroundColor: activeTab === 'operations' ? 'color-mix(in srgb, var(--accent) 10%, var(--surface-0))' : 'transparent',
              color: activeTab === 'operations' ? 'var(--accent)' : 'var(--text-strong)',
            }}
          >
            Operations Overview by Location
          </Link>
        </div>
      </section>

      {activeTab === 'main' && (
        <Card className="dashboard-rise-up">
          <CardContent className="space-y-3 p-2 pt-1.5 md:p-3 md:pt-1.5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="dashboard-rise-up overflow-hidden" style={{ animationDelay: `${index * 70}ms` }}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--text-strong)]">{item.value}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{item.subtitle}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${item.color} 20%, var(--surface-0))` }}>
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <Card className="dashboard-rise-up" style={{ animationDelay: '120ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">All-Site Occupancy Mix</CardTitle>
                <CardDescription>Distribution of all units by status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <div className="relative h-32 w-32 shrink-0">
                    <svg viewBox="0 0 140 140" className="dashboard-pop h-full w-full -rotate-90">
                      <circle cx="70" cy="70" r="56" fill="none" stroke="var(--surface-2)" strokeWidth="16" />
                      {allScope.donutSegments.map((segment) => (
                        <circle
                          key={segment.label}
                          cx="70"
                          cy="70"
                          r="56"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="16"
                          strokeDasharray={segment.dasharray}
                          strokeDashoffset={segment.dashoffset}
                          strokeLinecap="butt"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">{occupiedLabel}</p>
                      <p className="text-xl font-bold text-[var(--text-strong)]">{formatPercent(allScope.occupancyRate)}</p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    {allScope.donutSegments.map((segment) => (
                      <div key={segment.label} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1" style={{ backgroundColor: 'var(--surface-1)' }}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                          <span className="text-sm text-[var(--text-strong)]">{segment.label}</span>
                        </div>
                        <span className="text-xs font-medium text-[var(--text-muted)]">{segment.value} ({formatPercent(segment.percent)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-rise-up" style={{ animationDelay: '180ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Units by Location</CardTitle>
                <CardDescription>Top locations by unit volume and utilization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {locationStats.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <p className="truncate font-medium text-[var(--text-strong)]">{item.name}</p>
                      <p className="text-[var(--text-muted)]">{item.total} units • {formatPercent(item.utilization)}</p>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
                      <div
                        className="dashboard-grow-x h-full rounded-full"
                        style={{
                          width: `${(item.total / maxLocationUnits) * 100}%`,
                          background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #0ea5e9))',
                          animationDelay: '220ms',
                        }}
                      />
                    </div>
                  </div>
                ))}
                {locationStats.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">No locations with unit data yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <Card className="dashboard-rise-up" style={{ animationDelay: '140ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Monthly Recurring Revenue</CardTitle>
                <CardDescription>Estimated from active contracts across all sites.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{formatMoney(allScope.monthlyRecurringRevenue)}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Annual run rate: {formatMoney(allScope.annualRunRate)}</p>
              </CardContent>
            </Card>
            <Card className="dashboard-rise-up" style={{ animationDelay: '210ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Weekly Contract Revenue</CardTitle>
                <CardDescription>Weekly snapshots from active agreements.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{formatMoney(allScope.weeklyContractRevenue)}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Based on explicit weekly rates only.</p>
              </CardContent>
            </Card>
            <Card className="dashboard-rise-up" style={{ animationDelay: '280ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>Jump to core sections fast.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Link href="/dashboard/locations" className="rounded-xl border px-3 py-2 text-center text-xs font-semibold transition hover:opacity-90" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)', color: 'var(--text-strong)' }}>
                    Locations
                  </Link>
                  <Link href="/dashboard/units" className="rounded-xl border px-3 py-2 text-center text-xs font-semibold transition hover:opacity-90" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)', color: 'var(--text-strong)' }}>
                    Units
                  </Link>
                  <Link href="/dashboard/contracts" className="rounded-xl border px-3 py-2 text-center text-xs font-semibold transition hover:opacity-90" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)', color: 'var(--text-strong)' }}>
                    Contracts
                  </Link>
                </div>
                <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <p className="text-xs font-medium text-[var(--text-strong)]">Utilization {formatPercent(allScope.utilizationRate)} • {maintenanceLabel} {allScope.maintenanceUnits}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          </CardContent>
        </Card>
      )}

      {activeTab === 'operations' && (
        <Card className="dashboard-rise-up">
          <CardContent className="space-y-3 p-2 pt-1.5 md:p-3 md:pt-1.5">
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-1)' }}>
              <p className="text-sm font-semibold text-[var(--text-strong)]">Operations Overview by Location</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Choose a site to view only its operational graphics and KPIs.</p>
              <form method="get" className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="tab" value="operations" />
                <select
                  name="locationId"
                  defaultValue={selectedLocationId}
                  className="h-9 rounded-xl border px-3 text-sm"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-9 rounded-xl border px-3 text-sm font-medium"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                >
                  Apply Site
                </button>
              </form>
            </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Units', value: operationsScope.totalUnits, subtitle: `${operationsScope.occupiedUnits} ${occupiedLabel.toLowerCase()}`, icon: Building2, color: '#22c55e' },
              { label: 'Contracts', value: operationsContracts.length, subtitle: `${operationsScope.pendingContracts} pending`, icon: FileSignature, color: '#ef4444' },
              { label: 'Occupancy', value: formatPercent(operationsScope.occupancyRate), subtitle: selectedLocation?.name || 'No site', icon: MapPin, color: '#3b82f6' },
              { label: 'Utilization', value: formatPercent(operationsScope.utilizationRate), subtitle: `${operationsScope.maintenanceUnits} ${maintenanceLabel.toLowerCase()}`, icon: Activity, color: '#f59e0b' },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="dashboard-rise-up overflow-hidden" style={{ animationDelay: `${index * 70}ms` }}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold text-[var(--text-strong)]">{item.value}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{item.subtitle}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${item.color} 20%, var(--surface-0))` }}>
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <Card className="dashboard-rise-up" style={{ animationDelay: '120ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Site Occupancy Mix</CardTitle>
                <CardDescription>Status distribution for {selectedLocation?.name || 'selected site'}.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <div className="relative h-32 w-32 shrink-0">
                    <svg viewBox="0 0 140 140" className="dashboard-pop h-full w-full -rotate-90">
                      <circle cx="70" cy="70" r="56" fill="none" stroke="var(--surface-2)" strokeWidth="16" />
                      {operationsScope.donutSegments.map((segment) => (
                        <circle
                          key={segment.label}
                          cx="70"
                          cy="70"
                          r="56"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="16"
                          strokeDasharray={segment.dasharray}
                          strokeDashoffset={segment.dashoffset}
                          strokeLinecap="butt"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">{occupiedLabel}</p>
                      <p className="text-xl font-bold text-[var(--text-strong)]">{formatPercent(operationsScope.occupancyRate)}</p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    {operationsScope.donutSegments.map((segment) => (
                      <div key={segment.label} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1" style={{ backgroundColor: 'var(--surface-1)' }}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                          <span className="text-sm text-[var(--text-strong)]">{segment.label}</span>
                        </div>
                        <span className="text-xs font-medium text-[var(--text-muted)]">{segment.value} ({formatPercent(segment.percent)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-rise-up" style={{ animationDelay: '220ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Contract Flow (Site)</CardTitle>
                <CardDescription>New contracts for this location in last 6 months.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 items-end gap-3">
                  {operationsScope.monthlyContracts.map((item) => (
                    <div key={item.key} className="flex flex-col items-center gap-2">
                      <div className="relative flex h-36 w-full items-end justify-center rounded-xl" style={{ backgroundColor: 'var(--surface-1)' }}>
                        <div
                          className="dashboard-grow-y w-9 rounded-lg"
                          style={{
                            height: `${Math.max(8, (item.count / operationsScope.maxMonthlyContracts) * 100)}%`,
                            background: 'linear-gradient(180deg, #22c55e, #15803d)',
                            animationDelay: `${280 + Number(item.count) * 35}ms`,
                          }}
                          title={`${item.count} contracts`}
                        />
                        <span className="absolute right-2 top-2 text-xs text-[var(--text-muted)]">{item.count}</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <Card className="dashboard-rise-up" style={{ animationDelay: '140ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Monthly Recurring Revenue</CardTitle>
                <CardDescription>Estimated from active contracts in this site.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{formatMoney(operationsScope.monthlyRecurringRevenue)}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Annual run rate: {formatMoney(operationsScope.annualRunRate)}</p>
              </CardContent>
            </Card>
            <Card className="dashboard-rise-up" style={{ animationDelay: '210ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Weekly Contract Revenue</CardTitle>
                <CardDescription>Weekly snapshots from active agreements.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[var(--text-strong)]">{formatMoney(operationsScope.weeklyContractRevenue)}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Based on explicit weekly rates only.</p>
              </CardContent>
            </Card>
            <Card className="dashboard-rise-up" style={{ animationDelay: '280ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Selected Site</CardTitle>
                <CardDescription>Current operational scope.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-[var(--text-strong)]">{selectedLocation?.name || 'No location selected'}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{operationsUnits.length} units • {operationsContracts.length} contracts</p>
              </CardContent>
            </Card>
          </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
