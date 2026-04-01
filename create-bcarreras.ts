import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Buscar rol admin
  const adminRole = await prisma.role.findFirst({
    where: { name: 'admin' }
  })

  if (!adminRole) {
    console.log('❌ Rol admin no encontrado')
    return
  }

  const hashedPassword = await bcrypt.hash('Oldbury2022', 10)
  
  const user = await prisma.users.create({
    data: {
      username: 'bcarreras',
      email: 'bcarreras@spaceman.local',
      password: hashedPassword,
      authLevel: 10,
      roleId: adminRole.id,
      active: true,
      banned: false
    }
  })

  console.log('✅ Usuario creado:')
  console.log('   Email: bcarreras@spaceman.local')
  console.log('   Username: bcarreras')
  console.log('   Password: Oldbury2022')
  console.log('   Rol: admin')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
