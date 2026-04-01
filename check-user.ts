import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.users.findUnique({
    where: { email: 'admin@spaceman.local' }
  })

  if (!user) {
    console.log('❌ Usuario no encontrado')
    return
  }

  console.log('📧 Email:', user.email)
  console.log('🔑 Password hash:', user.password.substring(0, 30) + '...')
  console.log('🔐 Hash length:', user.password.length)
  
  // Verificar si el hash funciona
  const testMatch = await bcrypt.compare('Admin123!', user.password)
  console.log('✅ Password match test:', testMatch)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
