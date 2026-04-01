import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

async function main() {
  try {
    const settings = await prisma.settings.update({
      where: { id: 'default' },
      data: {
        siteLogo: '/logo.svg',
      }
    });
    
    console.log('✅ Logo actualizado');
    console.log('   siteLogo:', settings.siteLogo);
  } catch {
    // Si settings doesn't exist, create default
    console.log('Creating default settings...');
    await prisma.settings.create({
      data: {
        id: 'default',
        siteLogo: '/logo.svg',
      }
    });
    console.log('✅ Settings created');
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
})();