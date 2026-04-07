'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw, AlertCircle, CheckCircle2, Settings, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/contexts/SettingsContext';
import { Modal } from '@/components/ui/modal';

interface HubSpotDeal {
  id: string;
  dealName: string;
  amount: number | null;
  dealStage: string;
  pipeline: string;
  closeDate: Date | null;
  owner: string | null;
  lastSyncedAt: Date;
  rawData?: any;
}

interface PaginatedResponse {
  success: boolean;
  deals: HubSpotDeal[];
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function HubSpotDealsPage() {
  const { settings } = useSettings();
  const [deals, setDeals] = useState<HubSpotDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<HubSpotDeal | null>(null);
  const [dealDetails, setDealDetails] = useState<any>(null);
  const [loadingDeal, setLoadingDeal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeals, setTotalDeals] = useState(0);
  const dealsPerPage = 25;

  const hubspotConfig = (settings as any)?.hubspotConfig || {};
  const isEnabled = hubspotConfig.enabled;

  useEffect(() => {
    fetchDeals();
  }, [currentPage]);

  async function fetchDeals() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/hubspot/pull?page=${currentPage}&limit=${dealsPerPage}`);
      const payload: PaginatedResponse = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch HubSpot deals');
      }

      setDeals(payload.deals || []);
      setTotalPages(payload.totalPages);
      setTotalDeals(payload.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDealDetails(dealId: string) {
    setLoadingDeal(true);
    try {
      const response = await fetch(`/api/hubspot/deals/${dealId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch deal details');
      }

      setDealDetails(payload.deal);
      setSelectedDeal(payload.deal);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDeal(false);
    }
  }

  function handleViewDeal(deal: HubSpotDeal) {
    setSelectedDeal(deal);
    setDealDetails(deal.rawData);
  }

  function handleCloseModal() {
    setSelectedDeal(null);
    setDealDetails(null);
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/hubspot/pull', {
        method: 'POST',
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to sync HubSpot deals');
      }

      setSuccess(`Successfully synced ${payload.totalDeals} deals from HubSpot`);
      setCurrentPage(1); // Reset to first page after sync
      await fetchDeals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
  }

  function formatFieldValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderDealField(key: string, value: any): { label: string; value: string } | null {
    // Skip internal fields
    if (key.startsWith('_')) return null;

    // Format label
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    return {
      label,
      value: formatFieldValue(value),
    };
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
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">HubSpot Integration Not Configured</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              HubSpot Deals
            </h1>
            <p className="text-muted-foreground">
              {totalDeals.toLocaleString()} {totalDeals === 1 ? 'deal' : 'deals'} from your HubSpot CRM
              {totalDeals > dealsPerPage && ` (showing page ${currentPage} of ${totalPages})`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchDeals}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Deals'}
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Deals Table */}
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
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Deals Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No deals have been synced from HubSpot yet. Click "Sync Deals" to fetch your deals.
                </p>
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? 'Syncing...' : 'Sync Deals'}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm">Deal Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Stage</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Pipeline</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Close Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Owner</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal) => (
                      <tr key={deal.id} className="border-b hover:bg-muted/50 transition">
                        <td className="py-3 px-4 font-medium">{deal.dealName}</td>
                        <td className="py-3 px-4">
                          {deal.amount !== null ? (
                            <>£{deal.amount.toLocaleString()}</>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {deal.dealStage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{deal.pipeline}</td>
                        <td className="py-3 px-4 text-sm">
                          {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">{deal.owner || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDeal(deal)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * dealsPerPage) + 1} to {Math.min(currentPage * dealsPerPage, totalDeals)} of {totalDeals.toLocaleString()} deals
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            )}
          </CardContent>
        </Card>

        {/* Deal Details Modal */}
        {selectedDeal && dealDetails && (
          <Modal
            open={!!selectedDeal}
            onClose={handleCloseModal}
            title={selectedDeal.dealName || 'Deal Details'}
            description="All available fields from HubSpot"
          >
            {loadingDeal ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
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
                    <p className="font-semibold text-xs">{selectedDeal.id}</p>
                  </div>
                </div>

                {/* All Properties */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">All Properties</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {dealDetails.properties && Object.keys(dealDetails.properties).length > 0 ? (
                      Object.entries(dealDetails.properties).map(([key, value]) => {
                        const field = renderDealField(key, value);
                        if (!field) return null;
                        return (
                          <div key={key} className="flex justify-between py-2 border-b border-dotted">
                            <span className="text-sm text-muted-foreground pr-4">{field.label}</span>
                            <span className="text-sm font-medium text-right max-w-[60%] break-all">{field.value}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">No additional properties available</p>
                    )}
                  </div>
                </div>

                {/* HubSpot Link */}
                {dealDetails.properties?.hs_object_id && (
                  <div className="pt-4 border-t">
                    <a
                      href={`https://app.hubspot.com/contacts/${hubspotConfig.portalId || ''}/deal/${dealDetails.properties.hs_object_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Open in HubSpot →
                    </a>
                  </div>
                )}
              </div>
            )}
          </Modal>
        )}
      </div>
  );
}
