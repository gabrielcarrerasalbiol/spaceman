export const UNIT_STATUSES = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'] as const;

export type UnitStatusKey = (typeof UNIT_STATUSES)[number];

export type StatusConfigItem = {
  label: string;
  color: string;
};

export type StatusConfig = Record<UnitStatusKey, StatusConfigItem>;

export const DEFAULT_STATUS_CONFIG: StatusConfig = {
  AVAILABLE: { label: 'Available', color: '#22c55e' },
  RESERVED: { label: 'Reserved', color: '#f59e0b' },
  OCCUPIED: { label: 'Occupied', color: '#3b82f6' },
  MAINTENANCE: { label: 'Maintenance', color: '#ef4444' },
  INACTIVE: { label: 'Inactive', color: '#6b7280' },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return fallback;
}

function normalizeLabel(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function normalizeStatusConfig(value: unknown): StatusConfig {
  const source = isPlainObject(value) ? value : {};

  return UNIT_STATUSES.reduce((config, status) => {
    const item = isPlainObject(source[status]) ? source[status] : {};
    const fallback = DEFAULT_STATUS_CONFIG[status];

    config[status] = {
      label: normalizeLabel(item.label, fallback.label),
      color: normalizeHexColor(item.color, fallback.color),
    };

    return config;
  }, {} as StatusConfig);
}

export function getStatusColor(config: StatusConfig | undefined, status: UnitStatusKey) {
  return normalizeStatusConfig(config)[status].color;
}

export function getStatusLabel(config: StatusConfig | undefined, status: UnitStatusKey) {
  return normalizeStatusConfig(config)[status].label;
}

export function getStatusEntries(config: StatusConfig | undefined) {
  const normalized = normalizeStatusConfig(config);
  return UNIT_STATUSES.map((status) => ({
    status,
    label: normalized[status].label,
    color: normalized[status].color,
  }));
}
