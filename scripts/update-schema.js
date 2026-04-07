const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting schema update...');

  // Check if columns exist
  const existingColumns = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'hubspot_deals'
    AND column_name IN ('clientid', 'contractid', 'importedat')
  `;

  const columns = existingColumns.map(c => c.column_name.toLowerCase());

  // Add clientid if not exists
  if (!columns.includes('clientid')) {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" ADD COLUMN "clientid" TEXT`;
    console.log('✓ Added clientid column');
  } else {
    console.log('✓ clientid column already exists');
  }

  // Add contractid if not exists
  if (!columns.includes('contractid')) {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" ADD COLUMN "contractid" TEXT`;
    console.log('✓ Added contractid column');
  } else {
    console.log('✓ contractid column already exists');
  }

  // Add importedat if not exists
  if (!columns.includes('importedat')) {
    await prisma.$executeRaw`ALTER TABLE "hubspot_deals" ADD COLUMN "importedat" TIMESTAMP(3)`;
    console.log('✓ Added importedat column');
  } else {
    console.log('✓ importedat column already exists');
  }

  // Create indexes
  try {
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "hubspot_deals_clientid_idx" ON "hubspot_deals"("clientid")`;
    console.log('✓ Created clientid index');
  } catch (e) {
    console.log('✓ clientid index already exists');
  }

  try {
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "hubspot_deals_contractid_idx" ON "hubspot_deals"("contractid")`;
    console.log('✓ Created contractid index');
  } catch (e) {
    console.log('✓ contractid index already exists');
  }

  console.log('Schema update completed!');
}

main()
  .catch((e) => {
    console.error('Error updating schema:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
