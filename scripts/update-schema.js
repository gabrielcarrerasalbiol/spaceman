const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting HubSpotDeal schema update...');

  // Check current columns
  const existingColumns = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'hubspot_deals'
    AND column_name IN ('clientid', 'contractid', 'importedat')
  `;

  const columns = existingColumns.map(c => c.column_name.toLowerCase());
  console.log('Existing columns:', columns);

  // Step 1: Drop existing constraints if they exist
  console.log('\nChecking existing constraints...');

  try {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" DROP CONSTRAINT IF EXISTS "hubspot_deals_clientid_fkey"`;
    console.log('✓ Dropped existing clientId foreign key');
  } catch (e) {
    console.log('ℹ No clientId foreign key to drop');
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" DROP CONSTRAINT IF EXISTS "hubspot_deals_contractid_fkey"`;
    console.log('✓ Dropped existing contractId foreign key');
  } catch (e) {
    console.log('ℹ No contractId foreign key to drop');
  }

  try {
    await prisma.$executeRaw`DROP INDEX IF EXISTS "hubspot_deals_clientid_idx"`;
    console.log('✓ Dropped existing clientId index');
  } catch (e) {}

  try {
    await prisma.$executeRaw`DROP INDEX IF EXISTS "hubspot_deals_contractid_idx"`;
    console.log('✓ Dropped existing contractId index');
  } catch (e) {}

  // Step 2: Add columns if they don't exist
  console.log('\nAdding columns...');

  if (!columns.includes('clientid')) {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" ADD COLUMN "clientid" TEXT`;
    console.log('✓ Added clientId column');
  } else {
    console.log('✓ clientId column already exists');
  }

  if (!columns.includes('contractid')) {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" ADD COLUMN "contractid" TEXT`;
    console.log('✓ Added contractId column');
  } else {
    console.log('✓ contractId column already exists');
  }

  if (!columns.includes('importedat')) {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" ADD COLUMN "importedat" TIMESTAMP(3)`;
    console.log('✓ Added importedAt column');
  } else {
    console.log('✓ importedAt column already exists');
  }

  // Step 3: Add foreign key constraints
  console.log('\nAdding foreign key constraints...');

  await prisma.$executeRaw`
    ALTER TABLE "hubspot_deals"
    ADD CONSTRAINT "hubspot_deals_clientid_fkey"
    FOREIGN KEY ("clientid") REFERENCES "clients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
  `;
  console.log('✓ Added clientId foreign key');

  await prisma.$executeRaw`
    ALTER TABLE "hubspot_deals"
    ADD CONSTRAINT "hubspot_deals_contractid_fkey"
    FOREIGN KEY ("contractid") REFERENCES "contracts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
  `;
  console.log('✓ Added contractId foreign key');

  // Step 4: Create indexes
  console.log('\nCreating indexes...');

  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "hubspot_deals_clientid_idx" ON "hubspot_deals"("clientid")`;
  console.log('✓ Created clientId index');

  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "hubspot_deals_contractid_idx" ON "hubspot_deals"("contractid")`;
  console.log('✓ Created contractId index');

  // Step 5: Verify
  console.log('\nVerifying changes...');
  const result = await prisma.$queryRaw`
    SELECT
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_name = 'hubspot_deals'
    AND column_name IN ('clientid', 'contractid', 'importedat')
    ORDER BY column_name
  `;

  console.log('\nFinal schema:');
  console.table(result);

  console.log('\n✅ Schema update completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error updating schema:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
