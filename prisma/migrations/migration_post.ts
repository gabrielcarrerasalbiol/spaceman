import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Update settings with logo
    const settings = await prisma.settings.update({
      where: { id: 'default' },
      data: {
        siteLogo: '/logo.svg',
      }
    });

    console.log('✅ Logo actualizado en settings');
    console.log('   siteLogo:', settings.siteLogo);
  } else {
    console.log('❌ No settings found, creating default...');
    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      data: {
        siteLogo: '/logo.svg',
      }
    });

    console.log('✅ Settings created and siteLogo:', settings.siteLogo);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
})();
