-- Enum already correct in init migration, no changes needed

-- Insert new core issue types (idempotent) for every tenant
WITH tenants AS (
  SELECT id FROM "Tenant"
),
defaults AS (
  SELECT * FROM (VALUES
    ('PPA_TOP', 'PPA TOP'),
    ('PPA_OTHER', 'PPA Other'),
    ('EPC', 'EPC'),
    ('O_AND_M', 'O&M'),
    ('HSE', 'HSE')
  ) AS t(key, label)
)
INSERT INTO "IssueType" (id, "tenantId", key, label, active)
SELECT gen_random_uuid(), tenants.id, defaults.key, defaults.label, true
FROM tenants
CROSS JOIN defaults
ON CONFLICT ("tenantId", key) DO NOTHING;

-- Mark the legacy seeded issue types as inactive so they no longer surface in the directory UI
UPDATE "IssueType"
SET active = false
WHERE key IN ('SAFETY', 'FAULT', 'SECURITY', 'MAINTENANCE', 'OTHER', 'BUG', 'FEATURE', 'SUPPORT', 'INCIDENT', 'DOCUMENTATION', 'INFRASTRUCTURE')
  AND active = true;

