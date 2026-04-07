'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw, AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import Link from 'next/link';
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
}

export default function HubSpotDealsPage() {
  const { settings } = useSettings();
  const [deals, setDeals] = useState<HubSpotDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hubspotConfig = (settings as any)?.hubspotConfig || {};
  const isEnabled = hubspotConfig.enabled;

  useEffect(() => {
    fetchDeals();
  }, []);

  async function fetchDeals() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hubspot/pull');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch HubSpot deals');
      }

      setDeals(payload.deals || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      await fetchDeals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
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
              {deals.length} {deals.length === 1 ? 'deal' : 'deals'} from your HubSpot CRM
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
