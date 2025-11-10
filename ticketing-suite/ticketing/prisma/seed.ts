// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Skip if users already exist
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Seed skipped: users already exist.');
    return;
  }

  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-001' },
    update: {},
    create: { id: 'tenant-001', name: 'Default Tenant' },
  });

  // NOTE: these strings are bcrypt hashes
  // admin password: Admin123!
  const ADMIN_HASH =
    '$2b$10$kH2pLk9hZl5xQGg7n8lE0u5hBf7mEw5eHqO5y7pD1v5C4mQ0u5uY6';
  // user password: User123!
  const USER_HASH =
    '$2b$10$w4kO2w8E7zLZCzV5VQv0UuB4nB1iF2eD0pT3yH7rXqYyZl9JrVt7a';

  await prisma.user.create({
    data: {
      id: 'admin-001',
      tenantId: tenant.id,
      email: 'admin@example.com',
      name: 'Admin User',
      password: ADMIN_HASH,          // <-- field name is `password`
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      id: 'user-001',
      tenantId: tenant.id,
      email: 'user@example.com',
      name: 'Standard User',
      password: USER_HASH,           // <-- field name is `password`
      role: 'USER',
      isActive: true,
    },
  });

  console.log('Seed complete: admin=admin@example.com / user=user@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
