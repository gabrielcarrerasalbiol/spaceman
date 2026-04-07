import { prisma } from '../src/lib/prisma';

async function configureHubSpot() {
  try {
    console.log('🔧 Configuring HubSpot integration...');

    const settings = await prisma.settings.findFirst({
      where: { id: 'default' },
    });

    if (!settings) {
      console.error('❌ No settings found');
      process.exit(1);
    }

    const hubspotConfig = {
      apiKey: process.env.HUBSPOT_API_KEY || '',
      portalId: process.env.HUBSPOT_PORTAL_ID || '',
      enabled: true,
      lastSync: null,
    };

    if (!hubspotConfig.apiKey || !hubspotConfig.portalId) {
      console.error('❌ HUBSPOT_API_KEY and HUBSPOT_PORTAL_ID environment variables must be set');
      console.error('   Usage: HUBSPOT_API_KEY=your-key HUBSPOT_PORTAL_ID=your-id npx tsx scripts/configure-hubspot.ts');
      process.exit(1);
    }

    await prisma.settings.update({
      where: { id: 'default' },
      data: {
        hubspotConfig: hubspotConfig as any,
      },
    });

    console.log('✅ HubSpot configuration updated successfully!');
    console.log(`   Portal ID: ${hubspotConfig.portalId}`);
    console.log('   Enabled: true');
    console.log('');
    console.log('You can now:');
    console.log('  1. Go to /dashboard/hubspot to view deals');
    console.log('  2. Go to /dashboard/settings?tab=hubspot to modify configuration');
    console.log('  3. Click "Sync Deals" to fetch all deals from HubSpot');
  } catch (error) {
    console.error('❌ Error configuring HubSpot:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

configureHubSpot();
