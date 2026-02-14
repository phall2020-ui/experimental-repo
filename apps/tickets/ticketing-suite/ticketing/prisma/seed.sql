-- Seed script for adding initial IssueTypes to an existing tenant
-- Replace the tenant ID with your actual tenant ID

-- Insert IssueTypes (using a sample tenant ID)
-- If you already have a tenant, replace 'tenant-1' with your tenant ID

INSERT INTO "IssueType" (id, "tenantId", key, label, active)
VALUES
  (gen_random_uuid(), 'tenant-1', 'PPA_TOP', 'PPA TOP', true),
  (gen_random_uuid(), 'tenant-1', 'PPA_OTHER', 'PPA Other', true),
  (gen_random_uuid(), 'tenant-1', 'EPC', 'EPC', true),
  (gen_random_uuid(), 'tenant-1', 'O_AND_M', 'O&M', true),
  (gen_random_uuid(), 'tenant-1', 'HSE', 'HSE', true)
ON CONFLICT ("tenantId", key) DO NOTHING;

-- To use this script:
-- 1. Find your tenant ID: SELECT id FROM "Tenant";
-- 2. Replace 'tenant-1' above with your actual tenant ID
-- 3. Run: psql $DATABASE_URL -f prisma/seed.sql
