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
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/contexts/SettingsContext';

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

  useEffect(() => {
    void fetchDeals();
  }, [currentPage]);

  async function fetchDeals(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/hubspot/pull?page=${currentPage}&limit=${dealsPerPage}`);
      const payload: PaginatedResponse = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch HubSpot deals');
      }

      setDeals(payload.deals || []);
      setTotalPages(payload.totalPages || 1);
      setTotalDeals(payload.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error while fetching deals';
      setError(message);
    } finally {
      setLoading(false);
    }
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Deal Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Stage</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Pipeline</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Close Date</th>
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
                            <span>GBP {deal.amount.toLocaleString()}</span>
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
                        <td className="px-4 py-3 text-sm">
                          {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{deal.owner || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDeal(deal)}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
                  {selectedDeal.amount !== null ? `GBP ${selectedDeal.amount.toLocaleString()}` : '-'}
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
    </div>
  );
}
