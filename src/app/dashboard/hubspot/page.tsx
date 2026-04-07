'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Settings,
  X,
  Filter,
  Download,
  UserPlus,
  MapPin,
  Package,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';

interface DealFilters {
  dealName: string;
  amountMin: string;
  amountMax: string;
  dealStage: string;
  pipeline: string;
  closeDateFrom: string;
  closeDateTo: string;
  owner: string;
}

interface HubSpotDeal {
  id: string;
  dealName: string;
  amount: number | null;
  dealStage: string;
  pipeline: string;
  closeDate: Date | null;
  owner: string | null;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
  clientId?: string | null;
  contractId?: string | null;
  importedAt?: Date | null;
}

interface DealFilters {
  dealName: string;
  amountMin: string;
  amountMax: string;
  dealStage: string;
  pipeline: string;
  closeDateFrom: string;
  closeDateTo: string;
  owner: string;
}

interface HubSpotDeal {
  id: string;
  dealName: string;
  amount: number | null;
  dealStage: string;
  pipeline: string;
  closeDate: Date | null;
  owner: string | null;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

interface PaginatedResponse {
  success: boolean;
  deals: HubSpotDeal[];
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

interface HubSpotDealDetails {
  properties?: Record<string, unknown>;
}

interface ImportLocationMatchInfo {
  extractedLocationName: string;
  matchedLocationName: string | null;
  availableUnits: number;
}

function normalizeLocationText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractDealLocationName(payload: any, deal: HubSpotDeal): string {
  const props = payload?.hubspotDealFull?.properties || {};
  const candidates = [
    props.location_name,
    props.location,
    props.site_location,
    payload?.deal?.locationName,
    (deal.rawData as any)?.properties?.location_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return '';
}

function extractDealUnitHint(payload: any, deal: HubSpotDeal): string {
  const props = payload?.hubspotDealFull?.properties || {};
  const candidates = [
    props.unit_number,
    props.unit_name,
    props.unit,
    payload?.deal?.unitNumber,
    (deal.rawData as any)?.properties?.unit_number,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return '';
}

export default function HubSpotDealsPage() {
  const { settings } = useSettings();
  const hubspotConfig = (settings as Record<string, any>)?.hubspotConfig || {};
  const isEnabled = !!hubspotConfig.enabled;

  const [deals, setDeals] = useState<HubSpotDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<HubSpotDeal | null>(null);
  const [dealDetails, setDealDetails] = useState<HubSpotDealDetails | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeals, setTotalDeals] = useState(0);
  const dealsPerPage = 25;

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DealFilters>({
    dealName: '',
    amountMin: '',
    amountMax: '',
    dealStage: '',
    pipeline: '',
    closeDateFrom: '',
    closeDateTo: '',
    owner: '',
  });

  // Unique values for select dropdowns (populated from deals)
  const [uniqueStages, setUniqueStages] = useState<string[]>([]);
  const [uniquePipelines, setUniquePipelines] = useState<string[]>([]);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importDeal, setImportDeal] = useState<HubSpotDeal | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importLocationMatch, setImportLocationMatch] = useState<ImportLocationMatchInfo | null>(null);

  // Import form state
  const [importForm, setImportForm] = useState({
    createNewClient: false,
    clientId: '',
    clientData: {
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      phone: '',
      billingEmail: '',
      addressLine1: '',
      addressLine2: '',
      townCity: '',
      county: '',
      postcode: '',
      country: '',
    },
    unitId: '',
    locationId: '',
    startDate: '',
    endDate: '',
    weeklyRate: '',
    monthlyRate: '',
    depositAmount: '',
    paymentMethod: '',
    notes: '',
  });

  useEffect(() => {
    void fetchDeals();
  }, [currentPage, filters]);

  async function fetchDeals(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      // Build query params with filters
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(dealsPerPage),
      });

      // Add filters to query params
      if (filters.dealName) params.append('dealName', filters.dealName);
      if (filters.amountMin) params.append('amountMin', filters.amountMin);
      if (filters.amountMax) params.append('amountMax', filters.amountMax);
      if (filters.dealStage) params.append('dealStage', filters.dealStage);
      if (filters.pipeline) params.append('pipeline', filters.pipeline);
      if (filters.closeDateFrom) params.append('closeDateFrom', filters.closeDateFrom);
      if (filters.closeDateTo) params.append('closeDateTo', filters.closeDateTo);
      if (filters.owner) params.append('owner', filters.owner);

      const response = await fetch(`/api/hubspot/pull?${params.toString()}`);
      const payload: PaginatedResponse = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch HubSpot deals');
      }

      const fetchedDeals = payload.deals || [];
      setDeals(fetchedDeals);
      setTotalPages(payload.totalPages || 1);
      setTotalDeals(payload.total || 0);

      // Extract unique values for filters (from all deals, not just current page)
      setUniqueStages([...new Set(fetchedDeals.map((d) => d.dealStage).filter(Boolean))]);
      setUniquePipelines([...new Set(fetchedDeals.map((d) => d.pipeline).filter(Boolean))]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error while fetching deals';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key: keyof DealFilters, value: string): void {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filter changes
  }

  function clearFilters(): void {
    setFilters({
      dealName: '',
      amountMin: '',
      amountMax: '',
      dealStage: '',
      pipeline: '',
      closeDateFrom: '',
      closeDateTo: '',
      owner: '',
    });
    setCurrentPage(1);
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  // Import functions
  async function openImportModal(deal: HubSpotDeal): Promise<void> {
    setImportDeal(deal);
    setShowImportModal(true);
    setImportLoading(true);

    try {
      const response = await fetch(`/api/hubspot/deals/${deal.id}/import`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch import data');
      }

      setImportData(payload);

      const extractedLocationName = extractDealLocationName(payload, deal);
      const extractedUnitHint = extractDealUnitHint(payload, deal);
      const locations = payload.locations || [];

      const normalizedExtractedLocation = extractedLocationName
        ? normalizeLocationText(extractedLocationName)
        : '';

      const matchedLocation = normalizedExtractedLocation
        ? locations.find((location: any) => {
            const normalizedLocationName = normalizeLocationText(location.name || '');
            return (
              normalizedLocationName === normalizedExtractedLocation
              || normalizedLocationName.includes(normalizedExtractedLocation)
              || normalizedExtractedLocation.includes(normalizedLocationName)
            );
          })
        : null;

      const matchedUnit = matchedLocation && extractedUnitHint
        ? (matchedLocation.units || []).find((unit: any) => {
            const code = String(unit.code || '').trim().toLowerCase();
            const name = String(unit.name || '').trim().toLowerCase();
            const hint = extractedUnitHint.trim().toLowerCase();
            return code === hint || name === hint || code.includes(hint) || name.includes(hint);
          })
        : null;

      setImportLocationMatch(extractedLocationName
        ? {
            extractedLocationName,
            matchedLocationName: matchedLocation?.name || null,
            availableUnits: matchedLocation?.units?.length || 0,
          }
        : null);

      // Extract customer data from fetched HubSpot data
      const hubspotContacts = payload.hubspotContacts || [];
      const hubspotCompanies = payload.hubspotCompanies || [];

      // Pre-fill form with HubSpot contact/company data
      let clientFirstName = '';
      let clientLastName = '';
      let clientCompanyName = '';
      let clientEmail = '';
      let clientPhone = '';
      let clientAddressLine1 = '';
      let clientTownCity = '';
      let clientCounty = '';
      let clientPostcode = '';
      let clientCountry = '';

      // Try to get company data
      if (hubspotCompanies.length > 0) {
        const company = hubspotCompanies[0].properties || {};
        clientCompanyName = company.name || '';
        clientAddressLine1 = company.address || '';
        clientTownCity = company.city || '';
        clientCounty = company.state || '';
        clientPostcode = company.zip || '';
        clientCountry = company.country || '';
      }

      // Try to get contact data (prioritize over company for personal info)
      if (hubspotContacts.length > 0) {
        const contact = hubspotContacts[0].properties || {};
        clientFirstName = contact.firstname || '';
        clientLastName = contact.lastname || '';
        clientEmail = contact.email || clientEmail;
        clientPhone = contact.phone || contact.mobilephone || clientPhone;
        // Use contact address if no company address
        if (!clientAddressLine1) clientAddressLine1 = contact.address || '';
        if (!clientTownCity) clientTownCity = contact.city || '';
        if (!clientCounty) clientCounty = contact.state || '';
        if (!clientPostcode) clientPostcode = contact.zip || '';
        if (!clientCountry) clientCountry = contact.country || '';
      }

      // Set default start date from close date or today
      const defaultStartDate = deal.closeDate
        ? new Date(deal.closeDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      setImportForm({
        createNewClient: !payload.existingClient,
        clientId: payload.existingClient?.id || '',
        clientData: {
          firstName: clientFirstName,
          lastName: clientLastName || 'Unknown', // Default required
          companyName: clientCompanyName,
          email: clientEmail,
          phone: clientPhone,
          billingEmail: clientEmail,
          addressLine1: clientAddressLine1,
          addressLine2: '',
          townCity: clientTownCity,
          county: clientCounty,
          postcode: clientPostcode,
          country: clientCountry,
        },
        unitId: matchedUnit?.id || '',
        locationId: matchedLocation?.id || '',
        startDate: defaultStartDate,
        endDate: '',
        weeklyRate: deal.amount ? String(deal.amount) : '',
        monthlyRate: '',
        depositAmount: '',
        paymentMethod: '',
        notes: `Imported from HubSpot deal: ${deal.dealName}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error while fetching import data';
      setError(message);
    } finally {
      setImportLoading(false);
    }
  }

  function closeImportModal(): void {
    setShowImportModal(false);
    setImportDeal(null);
    setImportData(null);
    setImportLocationMatch(null);
    setImportForm({
      createNewClient: false,
      clientId: '',
      clientData: {
        firstName: '',
        lastName: '',
        companyName: '',
        email: '',
        phone: '',
        billingEmail: '',
        addressLine1: '',
        addressLine2: '',
        townCity: '',
        county: '',
        postcode: '',
        country: '',
      },
      unitId: '',
      locationId: '',
      startDate: '',
      endDate: '',
      weeklyRate: '',
      monthlyRate: '',
      depositAmount: '',
      paymentMethod: '',
      notes: '',
    });
  }

  async function submitImport(): Promise<void> {
    if (!importDeal) return;

    setImportSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/hubspot/deals/${importDeal.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importForm),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to import deal');
      }

      setSuccess(payload.message || 'Successfully imported deal');
      closeImportModal();
      await fetchDeals();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error while importing deal';
      setError(message);
    } finally {
      setImportSubmitting(false);
    }
  }

  function updateImportForm<K extends keyof typeof importForm>(key: K, value: typeof importForm[K]): void {
    setImportForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateClientData<K extends keyof typeof importForm.clientData>(key: K, value: string): void {
    setImportForm((prev) => ({
      ...prev,
      clientData: { ...prev.clientData, [key]: value },
    }));
  }

  async function handleSync(): Promise<void> {
    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/hubspot/pull', { method: 'POST' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to sync HubSpot deals');
      }

      setSuccess(`Successfully synced ${payload?.totalDeals ?? 0} deals from HubSpot`);
      setCurrentPage(1);
      await fetchDeals();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error while syncing deals';
      setError(message);
    } finally {
      setSyncing(false);
    }
  }

  function handleViewDeal(deal: HubSpotDeal): void {
    setSelectedDeal(deal);
    setDealDetails((deal.rawData as HubSpotDealDetails) || {});
  }

  function handleCloseModal(): void {
    setSelectedDeal(null);
    setDealDetails(null);
  }

  function formatFieldValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderDealField(key: string, value: unknown): { label: string; value: string } | null {
    if (key.startsWith('_')) return null;

    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (ch) => ch.toUpperCase())
      .trim();

    return { label, value: formatFieldValue(value) };
  }

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">HubSpot Deals</h1>
          <p className="text-muted-foreground">View and manage your HubSpot CRM deals</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">HubSpot Integration Not Configured</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Please configure your HubSpot API credentials in settings to enable this feature.
            </p>
            <Link href="/dashboard/settings?tab=hubspot">
              <Button>Go to Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showPagination = totalPages > 1;
  const from = (currentPage - 1) * dealsPerPage + 1;
  const to = Math.min(currentPage * dealsPerPage, totalDeals);
  const selectedImportLocation = importData?.locations?.find((l: any) => l.id === importForm.locationId) || null;
  const selectedImportUnit = selectedImportLocation?.units?.find((u: any) => u.id === importForm.unitId) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-6 w-6" />
            HubSpot Deals
          </h1>
          <p className="text-muted-foreground">
            {totalDeals.toLocaleString()} {totalDeals === 1 ? 'deal' : 'deals'} from your HubSpot CRM
            {totalDeals > dealsPerPage ? ` (showing page ${currentPage} of ${totalPages})` : ''}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters((prev) => !prev)}
            className={hasActiveFilters ? 'border-accent bg-accent/10' : ''}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              {Object.values(filters).filter((v) => v !== '').length}
            </span>}
          </Button>

          <Button variant="outline" onClick={() => void fetchDeals()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={() => void handleSync()} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Deals'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
          <CardDescription>
            Last synced: {hubspotConfig.lastSync ? new Date(hubspotConfig.lastSync).toLocaleString() : 'Never'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Deals Found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                No deals have been synced from HubSpot yet. Click "Sync Deals" to fetch your deals.
              </p>
              <Button onClick={() => void handleSync()} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync Deals'}
              </Button>
            </div>
          ) : (
            <>
              {/* Filters Section */}
              {showFilters && (
                <div className="mb-4 rounded-lg border border-dashed border-gray-300 bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Filter Deals</h3>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-1 h-3 w-3" />
                        Clear All
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Deal Name */}
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Deal Name</label>
                      <Input
                        placeholder="Search deals..."
                        value={filters.dealName}
                        onChange={(e) => updateFilter('dealName', e.target.value)}
                      />
                    </div>

                    {/* Amount Range */}
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Amount Range</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.amountMin}
                          onChange={(e) => updateFilter('amountMin', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.amountMax}
                          onChange={(e) => updateFilter('amountMax', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Stage */}
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Stage</label>
                      <Select
                        value={filters.dealStage}
                        onValueChange={(value) => updateFilter('dealStage', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All stages" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All stages</SelectItem>
                          {uniqueStages.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pipeline */}
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Pipeline</label>
                      <Select
                        value={filters.pipeline}
                        onValueChange={(value) => updateFilter('pipeline', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All pipelines" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All pipelines</SelectItem>
                          {uniquePipelines.map((pipeline) => (
                            <SelectItem key={pipeline} value={pipeline}>
                              {pipeline}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Close Date Range */}
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Close Date</label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={filters.closeDateFrom}
                          onChange={(e) => updateFilter('closeDateFrom', e.target.value)}
                        />
                        <Input
                          type="date"
                          value={filters.closeDateTo}
                          onChange={(e) => updateFilter('closeDateTo', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Owner */}
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Owner</label>
                      <Input
                        placeholder="Search owner..."
                        value={filters.owner}
                        onChange={(e) => updateFilter('owner', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Deal Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Stage</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Pipeline</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Owner</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {deals.map((deal) => (
                      <tr key={deal.id} className="border-b transition hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{deal.dealName}</td>
                        <td className="px-4 py-3">
                          {deal.amount !== null ? (
                            <span>£{deal.amount.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {deal.dealStage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{deal.pipeline}</td>
                        <td className="px-4 py-3 text-sm">{deal.owner || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleViewDeal(deal)}
                              title="View deal details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!deal.importedAt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void openImportModal(deal)}
                                title="Import deal"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {deal.importedAt && (
                              <span
                                className="inline-flex items-center gap-1 text-xs text-green-600"
                                title={`Imported on ${new Date(deal.importedAt).toLocaleDateString()}`}
                              >
                                <MapPin className="h-3 w-3" />
                                Imported
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showPagination && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {from} to {to} of {totalDeals.toLocaleString()} deals
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>

                    <span className="text-sm">Page {currentPage} of {totalPages}</span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={syncing}
        onClose={() => {}}
        title="Syncing HubSpot Deals"
        description="Fetching and updating records from HubSpot."
        className="max-w-md"
      >
        <div className="flex items-center gap-3 py-1">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Please keep this page open. Large accounts can take a little longer.
          </p>
        </div>
      </Modal>

      {selectedDeal && dealDetails && (
        <Modal
          open={!!selectedDeal}
          onClose={handleCloseModal}
          title={selectedDeal.dealName || 'Deal Details'}
          description="All available fields from HubSpot"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold">
                  {selectedDeal.amount !== null ? `£${selectedDeal.amount.toLocaleString()}` : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Stage</p>
                <p className="font-semibold">{selectedDeal.dealStage || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Pipeline</p>
                <p className="font-semibold">{selectedDeal.pipeline || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Close Date</p>
                <p className="font-semibold">
                  {selectedDeal.closeDate ? new Date(selectedDeal.closeDate).toLocaleDateString() : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-semibold">{selectedDeal.owner || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">HubSpot ID</p>
                <p className="text-xs font-semibold">{selectedDeal.id}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">All Properties</h3>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {dealDetails.properties && Object.keys(dealDetails.properties).length > 0 ? (
                  Object.entries(dealDetails.properties).map(([key, value]) => {
                    const field = renderDealField(key, value);
                    if (!field) return null;

                    return (
                      <div key={key} className="flex justify-between border-b border-dotted py-2">
                        <span className="pr-4 text-sm text-muted-foreground">{field.label}</span>
                        <span className="max-w-[60%] break-all text-right text-sm font-medium">{field.value}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No additional properties available</p>
                )}
              </div>
            </div>

            {dealDetails.properties?.hs_object_id ? (
              <div className="border-t pt-4">
                <a
                  href={`https://app.hubspot.com/contacts/${hubspotConfig.portalId || ''}/deal/${String(dealDetails.properties.hs_object_id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Open in HubSpot -&gt;
                </a>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Import Modal */}
      {showImportModal && importDeal && (
        <Modal
          open={showImportModal}
          onClose={closeImportModal}
          title={`Import Deal: ${importDeal.dealName}`}
          description="Create client and contract from HubSpot deal"
          className="max-w-2xl"
        >
          {importLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Deal Summary */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="mb-2 text-sm font-semibold">Deal Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>{' '}
                    <span className="font-medium">
                      {importDeal.amount !== null ? `£${importDeal.amount.toLocaleString()}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stage:</span>{' '}
                    <span className="font-medium">{importDeal.dealStage}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pipeline:</span>{' '}
                    <span className="font-medium">{importDeal.pipeline}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Close Date:</span>{' '}
                    <span className="font-medium">
                      {importDeal.closeDate ? new Date(importDeal.closeDate).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Existing import status */}
              {importData?.existingContract && (
                <div className="rounded-lg bg-green-50 p-4 text-green-800">
                  <p className="font-medium">This deal has already been imported</p>
                  <p className="text-sm">
                    Contract: {importData.existingContract.contractNumber}
                  </p>
                </div>
              )}

              {(importData?.hubspotOwner || importData?.matchedSystemUser) && (
                <div className={`rounded-lg p-4 text-sm ${importData?.matchedSystemUser ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                  <p className="font-medium">Deal Owner Mapping</p>
                  <p>
                    HubSpot owner: {importData?.hubspotOwner?.firstName || ''} {importData?.hubspotOwner?.lastName || ''}
                    {importData?.hubspotOwner?.email ? ` (${importData.hubspotOwner.email})` : ''}
                  </p>
                  <p>
                    {importData?.matchedSystemUser
                      ? `Matched system user: ${importData.matchedSystemUser.username || importData.matchedSystemUser.email}`
                      : 'No matching system user found for this HubSpot owner.'}
                  </p>
                </div>
              )}

              {/* Client Selection */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <UserPlus className="h-4 w-4" />
                  Client
                </h3>

                <div className="mb-3">
                  <label className="mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={importForm.createNewClient}
                      onChange={(e) => updateImportForm('createNewClient', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Create new client from deal data</span>
                  </label>
                </div>

                {!importForm.createNewClient ? (
                  <Select
                    value={importForm.clientId}
                    onValueChange={(value) => updateImportForm('clientId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing client" />
                    </SelectTrigger>
                    <SelectContent>
                      {importData?.clients?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.companyName
                            ? `${client.companyName} (${client.firstName} ${client.lastName})`
                            : `${client.firstName} ${client.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground">
                      New Client Details (from HubSpot associations)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">First Name *</label>
                        <Input
                          value={importForm.clientData.firstName}
                          onChange={(e) => updateClientData('firstName', e.target.value)}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Last Name *</label>
                        <Input
                          value={importForm.clientData.lastName}
                          onChange={(e) => updateClientData('lastName', e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">Company Name</label>
                        <Input
                          value={importForm.clientData.companyName}
                          onChange={(e) => updateClientData('companyName', e.target.value)}
                          placeholder="Acme Corp"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                        <Input
                          type="email"
                          value={importForm.clientData.email}
                          onChange={(e) => updateClientData('email', e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Phone</label>
                        <Input
                          type="tel"
                          value={importForm.clientData.phone}
                          onChange={(e) => updateClientData('phone', e.target.value)}
                          placeholder="+44 123 456 7890"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">Billing Email</label>
                        <Input
                          type="email"
                          value={importForm.clientData.billingEmail}
                          onChange={(e) => updateClientData('billingEmail', e.target.value)}
                          placeholder="billing@example.com"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">Address Line 1</label>
                        <Input
                          value={importForm.clientData.addressLine1}
                          onChange={(e) => updateClientData('addressLine1', e.target.value)}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">City</label>
                        <Input
                          value={importForm.clientData.townCity}
                          onChange={(e) => updateClientData('townCity', e.target.value)}
                          placeholder="London"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Postcode</label>
                        <Input
                          value={importForm.clientData.postcode}
                          onChange={(e) => updateClientData('postcode', e.target.value)}
                          placeholder="SW1A 1AA"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Country</label>
                        <Input
                          value={importForm.clientData.country}
                          onChange={(e) => updateClientData('country', e.target.value)}
                          placeholder="United Kingdom"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Location & Unit Selection */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4" />
                  Location & Unit
                </h3>

                {importLocationMatch && (
                  <div className={`mb-3 rounded-md border p-3 text-sm ${importLocationMatch.matchedLocationName ? 'border-green-300 bg-green-50 text-green-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                    {importLocationMatch.matchedLocationName
                      ? `Matched deal location "${importLocationMatch.extractedLocationName}" to "${importLocationMatch.matchedLocationName}" (${importLocationMatch.availableUnits} available units).`
                      : `Detected deal location "${importLocationMatch.extractedLocationName}" but could not find an exact location match. Please select manually.`}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Location</label>
                    <Select
                      value={importForm.locationId}
                      onValueChange={(value) => {
                        updateImportForm('locationId', value);
                        updateImportForm('unitId', ''); // Reset unit when location changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location">
                          {selectedImportLocation
                            ? `${selectedImportLocation.name} (${selectedImportLocation.units?.length || 0} units available)`
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {importData?.locations?.map((location: any) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} ({location.units?.length || 0} units available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {importForm.locationId && (
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Unit</label>
                      <Select value={importForm.unitId} onValueChange={(value) => updateImportForm('unitId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit">
                            {selectedImportUnit
                              ? `${selectedImportUnit.code || selectedImportUnit.name} - ${selectedImportUnit.type} - ${selectedImportUnit.sizeSqft} sqft - £${selectedImportUnit.weeklyRate || selectedImportUnit.monthlyRate}/${selectedImportUnit.weeklyRate ? 'wk' : 'mo'}`
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {importData?.locations
                            ?.find((l: any) => l.id === importForm.locationId)
                            ?.units?.map((unit: any) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.code || unit.name} - {unit.type} - {unit.sizeSqft} sqft -
                                £{unit.weeklyRate || unit.monthlyRate}/{unit.weeklyRate ? 'wk' : 'mo'}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Contract Details */}
              {importForm.unitId && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4" />
                    Contract Details
                  </h3>

                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Start Date *</label>
                        <Input
                          type="date"
                          value={importForm.startDate}
                          onChange={(e) => updateImportForm('startDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">End Date</label>
                        <Input
                          type="date"
                          value={importForm.endDate}
                          onChange={(e) => updateImportForm('endDate', e.target.value)}
                          min={importForm.startDate}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Weekly Rate</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={importForm.weeklyRate}
                          onChange={(e) => updateImportForm('weeklyRate', e.target.value)}
                          placeholder="100.00"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Monthly Rate</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={importForm.monthlyRate}
                          onChange={(e) => updateImportForm('monthlyRate', e.target.value)}
                          placeholder="400.00"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Deposit Amount</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={importForm.depositAmount}
                          onChange={(e) => updateImportForm('depositAmount', e.target.value)}
                          placeholder="200.00"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Payment Method</label>
                        <Select
                          value={importForm.paymentMethod}
                          onValueChange={(value) => updateImportForm('paymentMethod', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="direct_debit">Direct Debit</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                        value={importForm.notes}
                        onChange={(e) => updateImportForm('notes', e.target.value)}
                        placeholder="Additional contract notes..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={closeImportModal} disabled={importSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void submitImport()}
                  disabled={importSubmitting || (!importForm.createNewClient && !importForm.clientId)}
                >
                  {importSubmitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Import Deal
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
