import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Borrar usuario existente
  await prisma.users.deleteMany({
    where: { email: 'admin@spaceman.local' }
  })
  
  // Crear rol admin si no existe
  let adminRole = await prisma.role.findFirst({
    where: { name: 'admin' }
  })

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        label: 'Administrator',
        description: 'Full system access',
        isSystem: true,
        permissions: { all: true },
        priority: 100
      }
    })
  }

  // Crear usuario con hash rounds = 10 (más compatible)
  const hashedPassword = await bcrypt.hash('Admin123!', 10)
  
  const adminUser = await prisma.users.create({
    data: {
      username: 'admin',
      email: 'admin@spaceman.local',
      password: hashedPassword,
      authLevel: 10,
      roleId: adminRole.id,
      active: true,
      banned: false
    }
  })

  console.log('✅ Usuario recreado:')
  console.log('   Email: admin@spaceman.local')
  console.log('   Password: Admin123!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
