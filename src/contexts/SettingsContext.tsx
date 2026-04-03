'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DEFAULT_STATUS_CONFIG, normalizeStatusConfig, type StatusConfig } from '@/lib/status-config';

interface SiteSettings {
  siteName: string;
  siteLogo: string | null;
  siteDescription: string | null;
  primaryColor: string;
  unitStatusConfig: StatusConfig;
  wordpressConfig?: {
    siteUrl: string;
    apiUsername?: string;
    apiPassword?: string;
    enabled: boolean;
    locationsEndpoint?: string;
    unitsEndpoint?: string;
  };
}

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
}

const defaultSettings: SiteSettings = {
  siteName: 'Skeleton',
  siteLogo: null,
  siteDescription: null,
  primaryColor: '#3b82f6',
  unitStatusConfig: DEFAULT_STATUS_CONFIG,
  wordpressConfig: {
    siteUrl: '',
    enabled: false,
    locationsEndpoint: 'wp-json/spaceman/v1/locations',
    unitsEndpoint: 'wp-json/spaceman/v1/units',
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          siteName: data.siteName || defaultSettings.siteName,
          siteLogo: data.siteLogo || null,
          siteDescription: data.siteDescription || null,
          primaryColor: data.primaryColor || defaultSettings.primaryColor,
          unitStatusConfig: normalizeStatusConfig(data.unitStatusConfig),
          wordpressConfig: data.wordpressConfig || defaultSettings.wordpressConfig,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = async () => {
    await fetchSettings();
  };

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to update settings');
      }

      const data = await response.json();
      setSettings({
        siteName: data.siteName || defaultSettings.siteName,
        siteLogo: data.siteLogo || null,
        siteDescription: data.siteDescription || null,
        primaryColor: data.primaryColor || defaultSettings.primaryColor,
        unitStatusConfig: normalizeStatusConfig(data.unitStatusConfig),
        wordpressConfig: data.wordpressConfig || defaultSettings.wordpressConfig,
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
