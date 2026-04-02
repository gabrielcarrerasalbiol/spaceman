import { auth } from '@/lib/auth';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Activity, Building2, FileSignature, MapPin, UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const OCCUPANCY_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6b7280'];

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { locationId?: string };
}) {
  const session = await auth();
  const selectedLocationId = searchParams?.locationId || 'all';
  const [locations, units, contracts, clients] = await Promise.all([
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
  ]);

  const selectedLocation = selectedLocationId === 'all'
    ? null
    : locations.find((location) => location.id === selectedLocationId) || null;

  const scopedUnits = selectedLocation
    ? units.filter((unit) => unit.locationId === selectedLocation.id)
    : units;

  const scopedContracts = selectedLocation
    ? contracts.filter((contract) => contract.locationId === selectedLocation.id)
    : contracts;

  const statusCounts = {
    OCCUPIED: 0,
    AVAILABLE: 0,
    RESERVED: 0,
    MAINTENANCE: 0,
    INACTIVE: 0,
  };

  for (const unit of scopedUnits) {
    statusCounts[unit.status] += 1;
  }

  const totalUnits = scopedUnits.length;
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

  const occupancySlices = [
    { label: 'Occupied', value: occupiedUnits, color: OCCUPANCY_COLORS[0] },
    { label: 'Available', value: availableUnits, color: OCCUPANCY_COLORS[1] },
    { label: 'Reserved', value: reservedUnits, color: OCCUPANCY_COLORS[2] },
    { label: 'Maintenance', value: maintenanceUnits, color: OCCUPANCY_COLORS[3] },
    { label: 'Inactive', value: inactiveUnits, color: OCCUPANCY_COLORS[4] },
  ].filter((slice) => slice.value > 0);

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

  const now = new Date();
  const monthlyContracts = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const count = scopedContracts.filter((contract) => {
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

  const activeContracts = scopedContracts.filter((contract) => contract.status === 'ACTIVE').length;
  const pendingContracts = scopedContracts.filter((contract) => contract.status === 'PENDING_SIGNATURE').length;

  const monthlyRecurringRevenue = scopedContracts
    .filter((contract) => contract.status === 'ACTIVE')
    .reduce((total, contract) => {
      if (contract.monthlyRate !== null) return total + Number(contract.monthlyRate);
      if (contract.weeklyRate !== null) return total + (Number(contract.weeklyRate) * 52) / 12;
      return total;
    }, 0);

  const weeklyContractRevenue = scopedContracts
    .filter((contract) => contract.status === 'ACTIVE')
    .reduce((total, contract) => total + Number(contract.weeklyRate || 0), 0);

  const annualRunRate = monthlyRecurringRevenue * 12;

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
      value: totalUnits,
      subtitle: `${occupiedUnits} occupied`,
      icon: Building2,
      color: '#22c55e',
    },
    {
      label: 'Clients',
      value: clients,
      subtitle: `${activeContracts} active contracts`,
      icon: UserRound,
      color: '#f59e0b',
    },
    {
      label: 'Contracts',
      value: scopedContracts.length,
      subtitle: `${pendingContracts} pending signature`,
      icon: FileSignature,
      color: '#ef4444',
    },
  ];

  return (
    <div className="space-y-4">
      <section className="dashboard-fade-in relative overflow-hidden rounded-2xl border px-5 py-5" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface-0)), var(--surface-0) 58%)' }}>
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 30%, transparent), transparent 65%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Operations Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-strong)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form method="get" className="flex items-center gap-2">
              <select
                name="locationId"
                defaultValue={selectedLocationId}
                className="h-8 rounded-full border px-3 text-xs"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="h-8 rounded-full border px-3 text-xs font-medium"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
              >
                Apply
              </button>
              {selectedLocation && (
                <Link href="/dashboard" className="h-8 rounded-full border px-3 text-xs font-medium inline-flex items-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                  Reset
                </Link>
              )}
            </form>
            <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
              Occupancy {formatPercent(occupancyRate)}
            </span>
            <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
              Utilization {formatPercent(utilizationRate)}
            </span>
            <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
              Role {(session?.user as any)?.role || 'USER'}
            </span>
          </div>
        </div>
      </section>

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

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="dashboard-rise-up" style={{ animationDelay: '140ms' }}>
          <CardHeader>
            <CardTitle className="text-base">Monthly Recurring Revenue</CardTitle>
            <CardDescription>Estimated from active contracts in scope.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--text-strong)]">{formatMoney(monthlyRecurringRevenue)}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Annual run rate: {formatMoney(annualRunRate)}</p>
          </CardContent>
        </Card>
        <Card className="dashboard-rise-up" style={{ animationDelay: '210ms' }}>
          <CardHeader>
            <CardTitle className="text-base">Weekly Contract Revenue</CardTitle>
            <CardDescription>Weekly snapshots from active agreements.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--text-strong)]">{formatMoney(weeklyContractRevenue)}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Based on explicit weekly rates only.</p>
          </CardContent>
        </Card>
        <Card className="dashboard-rise-up" style={{ animationDelay: '280ms' }}>
          <CardHeader>
            <CardTitle className="text-base">Scope</CardTitle>
            <CardDescription>Current dashboard filter context.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-[var(--text-strong)]">{selectedLocation?.name || 'All Locations'}</p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{scopedUnits.length} units • {scopedContracts.length} contracts</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="dashboard-rise-up" style={{ animationDelay: '120ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Occupancy Mix</CardTitle>
            <CardDescription>Distribution of all units by status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="relative h-32 w-32 shrink-0">
                <svg viewBox="0 0 140 140" className="dashboard-pop h-full w-full -rotate-90">
                  <circle cx="70" cy="70" r={donutRadius} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
                  {donutSegments.map((segment) => (
                    <circle
                      key={segment.label}
                      cx="70"
                      cy="70"
                      r={donutRadius}
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
                  <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Occupied</p>
                  <p className="text-xl font-bold text-[var(--text-strong)]">{formatPercent(occupancyRate)}</p>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {donutSegments.map((segment) => (
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="dashboard-rise-up" style={{ animationDelay: '220ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Contract Flow (Last 6 Months)</CardTitle>
            <CardDescription>New contracts created per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 items-end gap-3">
              {monthlyContracts.map((item) => (
                <div key={item.key} className="flex flex-col items-center gap-2">
                  <div className="relative flex h-36 w-full items-end justify-center rounded-xl" style={{ backgroundColor: 'var(--surface-1)' }}>
                    <div
                      className="dashboard-grow-y w-9 rounded-lg"
                      style={{
                        height: `${Math.max(8, (item.count / maxMonthlyContracts) * 100)}%`,
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

        <Card className="dashboard-rise-up" style={{ animationDelay: '280ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
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
                <p className="text-xs font-medium text-[var(--text-strong)]">Utilization {formatPercent(utilizationRate)} • Maintenance {maintenanceUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Available', value: availableUnits, color: '#22c55e' },
          { label: 'Reserved', value: reservedUnits, color: '#f59e0b' },
          { label: 'Occupied', value: occupiedUnits, color: '#3b82f6' },
          { label: 'Maintenance', value: maintenanceUnits, color: '#ef4444' },
          { label: 'Inactive', value: inactiveUnits, color: '#6b7280' },
        ].map((status, index) => (
          <Card key={status.label} className="dashboard-rise-up" style={{ animationDelay: `${320 + index * 45}ms` }}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{status.label}</p>
              <p className="mt-1 text-xl font-bold" style={{ color: status.color }}>{status.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
