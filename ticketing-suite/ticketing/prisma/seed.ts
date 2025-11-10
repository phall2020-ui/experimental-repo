/*import { PrismaClient, TicketPriority } from '@prisma/client';
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
  const sites = [
    { id: 'site-1', name: 'Main Office', location: 'New York, NY' },
    { id: 'site-2', name: 'West Coast Branch', location: 'San Francisco, CA' },
    { id: 'site-3', name: 'Chicago Facility', location: 'Chicago, IL' },
    { id: 'site-4', name: 'Dallas Warehouse', location: 'Dallas, TX' },
    { id: 'site-5', name: 'Boston Office', location: 'Boston, MA' },
    { id: 'site-6', name: 'Seattle Branch', location: 'Seattle, WA' },
    { id: 'site-7', name: 'Miami Location', location: 'Miami, FL' },
    { id: 'site-8', name: 'Denver Site', location: 'Denver, CO' },
  ];

  const createdSites = [];
  for (const siteData of sites) {
    const site = await prisma.site.upsert({
      where: { id: siteData.id },
      update: {},
      create: {
        id: siteData.id,
        tenantId: tenant.id,
        name: siteData.name,
        location: siteData.location,
      },
    });
    createdSites.push(site);
  }
  console.log('Created sites:', createdSites.map(s => s.name).join(', '));
  
  const site1 = createdSites[0];
  const site2 = createdSites[1];

  // Create users
  const users = [
    { id: 'admin-1', email: 'admin@example.com', password: 'admin123', name: 'Admin User', role: 'ADMIN' as const },
    { id: 'user-1', email: 'user@example.com', password: 'user123', name: 'Regular User', role: 'USER' as const },
    { id: 'user-2', email: 'john.doe@example.com', password: 'password123', name: 'John Doe', role: 'USER' as const },
    { id: 'user-3', email: 'jane.smith@example.com', password: 'password123', name: 'Jane Smith', role: 'USER' as const },
    { id: 'user-4', email: 'bob.jones@example.com', password: 'password123', name: 'Bob Jones', role: 'USER' as const },
    { id: 'user-5', email: 'alice.brown@example.com', password: 'password123', name: 'Alice Brown', role: 'USER' as const },
    { id: 'user-6', email: 'charlie.wilson@example.com', password: 'password123', name: 'Charlie Wilson', role: 'USER' as const },
    { id: 'user-7', email: 'diana.miller@example.com', password: 'password123', name: 'Diana Miller', role: 'USER' as const },
    { id: 'user-8', email: 'edward.davis@example.com', password: 'password123', name: 'Edward Davis', role: 'USER' as const },
    { id: 'admin-2', email: 'manager@example.com', password: 'manager123', name: 'Manager User', role: 'ADMIN' as const },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        id: userData.id,
        tenantId: tenant.id,
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
      },
    });
    createdUsers.push(user);
  }
  console.log('Created users:', createdUsers.map(u => u.email).join(', '));
  
  const admin = createdUsers.find(u => u.role === 'ADMIN')!;
  const user = createdUsers.find(u => u.role === 'USER')!;

  // Create issue types
  const issueTypes = [
    { key: 'PPA_TOP', label: 'PPA TOP' },
    { key: 'PPA_OTHER', label: 'PPA Other' },
    { key: 'EPC', label: 'EPC' },
    { key: 'O_AND_M', label: 'O&M' },
    { key: 'HSE', label: 'HSE' },
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
      typeKey: 'PPA_TOP',
      description: 'Fire extinguisher needs inspection',
      details: 'Annual inspection is overdue',
<<<<<<< HEAD
      status: 'AWAITING_RESPONSE',
      priority: 'P2',
=======
      status: 'NEW',
      priority: 'Medium' as TicketPriority,
>>>>>>> 74f08e7 (Align dashboard site column and custom field filtering)
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
      typeKey: 'O_AND_M',
      description: 'HVAC system not working',
      details: 'Temperature control unit is not responding',
<<<<<<< HEAD
      status: 'ADE_TO_RESPOND',
      priority: 'P1',
=======
      status: 'TRIAGE',
      priority: 'High' as TicketPriority,
>>>>>>> 74f08e7 (Align dashboard site column and custom field filtering)
      assignedUserId: admin.id,
    },
  });
  console.log('Created tickets:', ticket1.id, ticket2.id);

  console.log('Seeding complete!');
  console.log('\n=== Test Credentials ===');
  console.log('\nAdmin Users:');
  createdUsers.filter(u => u.role === 'ADMIN').forEach(u => {
    const userData = users.find(ud => ud.email === u.email)!;
    console.log(`  ${u.name} - email: ${u.email}, password: ${userData.password}`);
  });
  console.log('\nRegular Users:');
  createdUsers.filter(u => u.role === 'USER').forEach(u => {
    const userData = users.find(ud => ud.email === u.email)!;
    console.log(`  ${u.name} - email: ${u.email}, password: ${userData.password}`);
  });
  console.log('\n=== Sites ===');
  createdSites.forEach(s => {
    console.log(`  ${s.name} (${s.location})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });*/
