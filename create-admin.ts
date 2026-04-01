import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Verificar si existe el rol admin
  let adminRole = await prisma.role.findFirst({
    where: { name: 'admin' }
  })

  // 2. Crear rol admin si no existe
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        label: 'Administrator',
        description: 'Full system access',
        isSystem: true,
        permissions: {
          users: ['read', 'write', 'delete'],
          roles: ['read', 'write', 'delete'],
          settings: ['read', 'write'],
          all: true
        },
        priority: 100
      }
    })
    console.log('✅ Rol admin creado')
  } else {
    console.log('ℹ️  Rol admin ya existe')
  }

  // 3. Verificar si ya existe un usuario admin
  const existingAdmin = await prisma.users.findFirst({
    where: { 
      OR: [
        { email: 'admin@spaceman.local' },
        { username: 'admin' }
      ]
    }
  })

  if (existingAdmin) {
    console.log('⚠️  Usuario admin ya existe:', existingAdmin.email)
    return
  }

  // 4. Crear usuario admin
  const hashedPassword = await bcrypt.hash('Admin123!', 12)
  
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

  console.log('✅ Usuario admin creado:')
  console.log('   Email: admin@spaceman.local')
  console.log('   Password: Admin123!')
  console.log('   Rol: admin (id: ' + adminRole.id + ')')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
