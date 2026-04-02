import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { PrismaClient, UnitStatus } from '@prisma/client';

const prisma = new PrismaClient();

type CsvRow = Record<string, string>;

type ImportStats = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  const getArg = (name: string): string | undefined => {
    const prefixed = args.find((a) => a.startsWith(`--${name}=`));
    return prefixed ? prefixed.split('=').slice(1).join('=') : undefined;
  };

  return {
    command,
    locationsPath:
      getArg('locations') ||
      '/Users/gabrielcarrerasalbiol/Downloads/Locations-Export-2026-April-02-1237.csv',
    unitsPath:
      getArg('units') ||
      '/Users/gabrielcarrerasalbiol/Downloads/Units-Export-2026-April-02-1236.csv',
  };
}

function cleanString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function parseNumber(value: unknown): number | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const normalized = cleaned.replace(/[^0-9.-]+/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown): boolean {
  const cleaned = (cleanString(value) || '').toLowerCase();
  return ['1', 'true', 'yes', 'y', 'open', 'active'].includes(cleaned);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function readCsv(filePath: string): CsvRow[] {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`CSV file not found: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, 'utf8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as CsvRow[];
}

async function importLocations(locationsPath: string) {
  const rows = readCsv(locationsPath);
  const stats: ImportStats = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      const title = cleanString(row.Title);
      const legacyId = parseNumber(row.ID);

      if (!title || legacyId === null) {
        stats.skipped += 1;
        continue;
      }

      const slug = cleanString(row.Slug) || slugify(title);
      const addressLine1 = cleanString(row._address_line_1) || cleanString(row.address_line_1);
      const addressLine2 = cleanString(row._address_line_2) || cleanString(row.address_line_2);
      const townCity = cleanString(row._towncity) || cleanString(row.towncity);
      const county = cleanString(row._county) || cleanString(row.county);
      const postcode = cleanString(row._postcode) || cleanString(row.postcode);
      const email = cleanString(row['Email Address']);
      const phone = cleanString(row['Telephone Number']);
      const openingHours = cleanString(row['Opening Hours']);
      const latitude = parseNumber(row['Location Map_lat']) ?? parseNumber(row.latitude);
      const longitude = parseNumber(row['Location Map_lng']) ?? parseNumber(row.longitude);
      const active = (cleanString(row.Status) || '').toLowerCase() === 'publish';

      const existing = await prisma.location.findUnique({ where: { legacyId } });

      await prisma.location.upsert({
        where: { legacyId },
        update: {
          name: title,
          slug,
          addressLine1,
          addressLine2,
          townCity,
          county,
          postcode,
          email,
          phone,
          openingHours,
          latitude,
          longitude,
          active,
        },
        create: {
          legacyId,
          name: title,
          slug,
          addressLine1,
          addressLine2,
          townCity,
          county,
          postcode,
          email,
          phone,
          openingHours,
          latitude,
          longitude,
          active,
        },
      });

      if (existing) stats.updated += 1;
      else stats.inserted += 1;
    } catch (error) {
      stats.errors += 1;
    }
  }

  return stats;
}

function deriveUnitStatus(row: CsvRow): UnitStatus {
  const active = parseBoolean(row.Active);
  const primaryStatus = (cleanString(row.Status) || '').toLowerCase();

  if (!active || primaryStatus !== 'publish') {
    return UnitStatus.INACTIVE;
  }

  if (parseBoolean(row['prorize_available']) || parseBoolean(row['Has 24/7 Drive-Up Storage Units?'])) {
    return UnitStatus.AVAILABLE;
  }

  return UnitStatus.OCCUPIED;
}

async function getOrCreateLocationByName(rawName: string) {
  const normalizedName = rawName.trim();
  const slug = slugify(normalizedName);

  let location = await prisma.location.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: normalizedName, mode: 'insensitive' } },
      ],
    },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        name: normalizedName,
        slug,
        active: true,
      },
    });
  }

  return location;
}

async function importUnits(unitsPath: string) {
  const rows = readCsv(unitsPath);
  const stats: ImportStats = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      const legacyId = parseNumber(row.ID);
      const title = cleanString(row.Title);

      if (legacyId === null || !title) {
        stats.skipped += 1;
        continue;
      }

      const locationRaw =
        cleanString(row.location_from) ||
        cleanString(row['Unit Locations']) ||
        cleanString(row['_yoast_wpseo_primary_unit-location']);

      if (!locationRaw) {
        stats.skipped += 1;
        continue;
      }

      const location = await getOrCreateLocationByName(locationRaw);

      const code =
        cleanString(row['Size Code']) ||
        cleanString(row['Size Code 1']) ||
        cleanString(row.Types) ||
        cleanString(row._unit_size_display) ||
        cleanString(row._unit_size) ||
        title;

      const weeklyRate = parseNumber(row['Weekly Rate']) ?? parseNumber(row['Cost per week']);
      const monthlyRate = parseNumber(row['Monthly Rate']);
      const salePrice = parseNumber(row['Sale Price']);
      const sizeSqft = parseNumber(row['Size ft']) ?? parseNumber(row._unit_size);
      const dimensions = cleanString(row['Unit Dimensions']) || cleanString(row.Dimensions);
      const offer = cleanString(row.Offer) || cleanString(row.prorize_offer);
      const unitType = cleanString(row.Types) || cleanString(row.Categories);
      const description = cleanString(row.Description) || cleanString(row.Content);
      const is24hDriveUp =
        (cleanString(row.Categories) || '').toLowerCase().includes('24hr drive-up') ||
        parseBoolean(row['Has 24/7 Drive-Up Storage Units?']);
      const isIndoor =
        (cleanString(row.Categories) || '').toLowerCase().includes('indoor storage') ||
        parseBoolean(row['Has Indoor Storage Units?']);
      const status = deriveUnitStatus(row);
      const active = status !== UnitStatus.INACTIVE;

      const existing = await prisma.unit.findUnique({ where: { legacyId } });

      await prisma.unit.upsert({
        where: { legacyId },
        update: {
          locationId: location.id,
          code,
          name: title,
          type: unitType,
          sizeSqft,
          dimensions,
          weeklyRate,
          monthlyRate,
          salePrice,
          offer,
          is24hDriveUp,
          isIndoor,
          status,
          active,
          description,
        },
        create: {
          legacyId,
          locationId: location.id,
          code,
          name: title,
          type: unitType,
          sizeSqft,
          dimensions,
          weeklyRate,
          monthlyRate,
          salePrice,
          offer,
          is24hDriveUp,
          isIndoor,
          status,
          active,
          description,
        },
      });

      if (existing) stats.updated += 1;
      else stats.inserted += 1;
    } catch (error) {
      stats.errors += 1;
    }
  }

  return stats;
}

function printStats(label: string, stats: ImportStats) {
  console.log(`\n${label}`);
  console.table(stats);
}

async function main() {
  const { command, locationsPath, unitsPath } = parseArgs();

  console.log('Starting CSV import...');
  console.log(`Mode: ${command}`);

  if (command === 'locations' || command === 'all') {
    const locationsStats = await importLocations(locationsPath);
    printStats('Locations import report', locationsStats);
  }

  if (command === 'units' || command === 'all') {
    const unitsStats = await importUnits(unitsPath);
    printStats('Units import report', unitsStats);
  }

  console.log('\nImport complete.');
}

main()
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
