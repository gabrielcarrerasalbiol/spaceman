export function normalizeSizeSqft(sizeSqft: number | string | null | undefined) {
  if (sizeSqft === null || sizeSqft === undefined || sizeSqft === '') return null;
  const normalized = Number(sizeSqft);
  return Number.isFinite(normalized) ? normalized : null;
}

export function normalizeUnitNumber(unitNumber: number | string | null | undefined) {
  if (unitNumber === null || unitNumber === undefined || unitNumber === '') return null;
  const normalized = Number(unitNumber);
  return Number.isFinite(normalized) ? normalized : null;
}

export function formatUnitSizeLabel(sizeSqft: number | string | null | undefined) {
  const normalized = normalizeSizeSqft(sizeSqft);
  return normalized ? `${normalized}Sqft` : 'Unspecified Size';
}

export function formatUnitDisplayName(params: {
  sizeSqft?: number | string | null;
  unitNumber?: number | string | null;
  code?: string | null;
  name?: string | null;
}) {
  const sizeLabel = formatUnitSizeLabel(params.sizeSqft);
  const normalizedUnitNumber = normalizeUnitNumber(params.unitNumber);

  if (normalizedUnitNumber) {
    return `${sizeLabel} ${normalizedUnitNumber}`;
  }

  if (params.code) return params.code;
  if (params.name) return params.name;
  return sizeLabel;
}

export function buildGeneratedUnitCode(sizeSqft: number | string | null | undefined, unitNumber: number | string | null | undefined) {
  return formatUnitDisplayName({ sizeSqft, unitNumber });
}