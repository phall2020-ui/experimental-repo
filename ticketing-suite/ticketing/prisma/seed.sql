-- Seed script for adding initial IssueTypes to an existing tenant
-- Replace the tenant ID with your actual tenant ID

-- Insert IssueTypes (using a sample tenant ID)
-- If you already have a tenant, replace 'tenant-1' with your tenant ID

INSERT INTO "IssueType" (id, "tenantId", key, label, active)
VALUES
  (gen_random_uuid(), 'tenant-1', 'SAFETY', 'Safety', true),
  (gen_random_uuid(), 'tenant-1', 'FAULT', 'Fault', true),
  (gen_random_uuid(), 'tenant-1', 'SECURITY', 'Security', true),
  (gen_random_uuid(), 'tenant-1', 'MAINTENANCE', 'Maintenance', true),
  (gen_random_uuid(), 'tenant-1', 'OTHER', 'Other', true)
ON CONFLICT ("tenantId", key) DO NOTHING;

-- To use this script:
-- 1. Find your tenant ID: SELECT id FROM "Tenant";
-- 2. Replace 'tenant-1' above with your actual tenant ID
-- 3. Run: psql $DATABASE_URL -f prisma/seed.sql
