import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Use upsert to update or create settings with logo
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: {
      siteLogo: '/logo.svg',
    },
    create: {
      id: 'default',
      siteLogo: '/logo.svg',
    }
  });

  console.log('✅ Logo actualizado en settings');
  console.log('   siteLogo:', settings.siteLogo);
}

main()
  .catch(async (e) => {
    console.error('❌ Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
