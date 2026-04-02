import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_STATUS_CONFIG } from '../src/lib/status-config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default settings
  console.log('Creating default settings...');
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteName: 'Skeleton',
      siteLogo: null,
      siteDescription: 'A Next.js authentication starter template',
      primaryColor: '#3b82f6',
      unitStatusConfig: DEFAULT_STATUS_CONFIG,
    },
  });
  console.log('✅ Settings created:', settings);

  // Create roles
  console.log('Creating roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      label: 'Administrator',
      description: 'Full system access',
      isSystem: true,
      permissions: { all: true },
      priority: 100,
      active: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      label: 'User',
      description: 'Standard user access',
      isSystem: true,
      permissions: { read: true },
      priority: 1,
      active: true,
    },
  });
  console.log('✅ Roles created:', { adminRole, userRole });

  // Create admin user
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
      roleId: adminRole.id,
      active: true,
      banned: false,
    },
  });
  console.log('✅ Admin user created:', { email: adminUser.email, password: 'admin123' });

  // Create test user
  console.log('Creating test user...');
  const userPassword = await bcrypt.hash('user123', 10);
  const testUser = await prisma.users.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'testuser',
      password: userPassword,
      roleId: userRole.id,
      active: true,
      banned: false,
    },
  });
  console.log('✅ Test user created:', { email: testUser.email, password: 'user123' });

  console.log('🎉 Seed completed!');
  console.log('');
  console.log('📋 Default credentials:');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   User:  user@example.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
