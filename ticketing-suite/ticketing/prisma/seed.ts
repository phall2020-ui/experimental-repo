import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-1' },
    update: {},
    create: {
      id: 'tenant-1',
      name: 'Test Tenant',
    },
  });
  console.log('Created tenant:', tenant.id);

  // Create sites
  const site1 = await prisma.site.upsert({
    where: { id: 'site-1' },
    update: {},
    create: {
      id: 'site-1',
      tenantId: tenant.id,
      name: 'Main Office',
      location: 'New York, NY',
    },
  });

  const site2 = await prisma.site.upsert({
    where: { id: 'site-2' },
    update: {},
    create: {
      id: 'site-2',
      tenantId: tenant.id,
      name: 'West Coast Branch',
      location: 'San Francisco, CA',
    },
  });
  console.log('Created sites:', site1.name, site2.name);

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: 'admin-1',
      tenantId: tenant.id,
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      id: 'user-1',
      tenantId: tenant.id,
      email: 'user@example.com',
      password: userPassword,
      name: 'Regular User',
      role: 'USER',
    },
  });
  console.log('Created users:', admin.email, user.email);

  // Create issue types
  const issueTypes = [
    { key: 'SAFETY', label: 'Safety' },
    { key: 'FAULT', label: 'Fault' },
    { key: 'SECURITY', label: 'Security' },
    { key: 'MAINTENANCE', label: 'Maintenance' },
    { key: 'OTHER', label: 'Other' },
  ];

  for (const type of issueTypes) {
    await prisma.issueType.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: type.key,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        key: type.key,
        label: type.label,
        active: true,
      },
    });
  }
  console.log('Created issue types:', issueTypes.map(t => t.label).join(', '));

  // Create sample tickets
  const ticket1 = await prisma.ticket.upsert({
    where: { id: 'ticket-1' },
    update: {},
    create: {
      id: 'ticket-1',
      tenantId: tenant.id,
      siteId: site1.id,
      typeKey: 'SAFETY',
      description: 'Fire extinguisher needs inspection',
      details: 'Annual inspection is overdue',
      status: 'NEW',
      priority: 'P2',
      assignedUserId: user.id,
    },
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { id: 'ticket-2' },
    update: {},
    create: {
      id: 'ticket-2',
      tenantId: tenant.id,
      siteId: site2.id,
      typeKey: 'FAULT',
      description: 'HVAC system not working',
      details: 'Temperature control unit is not responding',
      status: 'TRIAGE',
      priority: 'P1',
      assignedUserId: admin.id,
    },
  });
  console.log('Created tickets:', ticket1.id, ticket2.id);

  console.log('Seeding complete!');
  console.log('\nTest credentials:');
  console.log('Admin - email: admin@example.com, password: admin123');
  console.log('User - email: user@example.com, password: user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
