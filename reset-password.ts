import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Oldbury2022', 10)
  
  const user = await prisma.users.update({
    where: { email: 'admin@spaceman.local' },
    data: { password: hashedPassword }
  })

  console.log('✅ Password actualizado:')
  console.log('   Email: admin@spaceman.local')
  console.log('   Password: Oldbury2022')
  
  // Verificar
  const testMatch = await bcrypt.compare('Oldbury2022', user.password)
  console.log('✅ Verification:', testMatch)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
