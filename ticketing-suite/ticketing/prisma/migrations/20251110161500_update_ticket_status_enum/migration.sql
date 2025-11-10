-- Create new enum with target values
CREATE TYPE "TicketStatus_new" AS ENUM ('AWAITING_RESPONSE', 'ADE_TO_RESPOND', 'ON_HOLD', 'CLOSED');

-- Update ticket statuses to the new values while transferring column type
ALTER TABLE "Ticket"
  ALTER COLUMN "status" TYPE "TicketStatus_new"
  USING (
    CASE
      WHEN status IN ('NEW', 'TRIAGE') THEN 'AWAITING_RESPONSE'::"TicketStatus_new"
      WHEN status IN ('IN_PROGRESS') THEN 'ADE_TO_RESPOND'::"TicketStatus_new"
      WHEN status = 'PENDING' THEN 'ON_HOLD'::"TicketStatus_new"
      WHEN status IN ('RESOLVED', 'CLOSED') THEN 'CLOSED'::"TicketStatus_new"
      ELSE 'AWAITING_RESPONSE'::"TicketStatus_new"
    END
  );

-- Replace old enum type with the new definition
DROP TYPE "TicketStatus";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";

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

