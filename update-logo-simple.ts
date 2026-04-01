import { PrismaClient } from '@prisma/client'

import { $ } from '@prisma/client/runt'

async function main() {
  // Update settings with logo
  await prisma.settings.update({
    where: { id: 'default' },
    data: { siteLogo: '/logo.svg' }
  })
  
  console.log('✅ Logo actualizado');
}

 console.log('   siteLogo:', settings.siteLogo);
  } catch {
error) {
    // Si settings doesn't exist, create default
    console.log('Creating default settings...');
    await prisma.settings.upsert({
      where: { id: 'default' },
      data: { siteLogo: '/logo.svg' }
    })
    console.log('✅ Settings created');
    console.log('   siteLogo:', settings.siteLogo);
  }
})
  .finally(async () => {
    await prisma.$disconnect()
  })
})()
