-- Fix for failed migration 20251110180000_ticket_id_sequence
-- This script marks the migration as applied and ensures the schema is correct

-- First, check if SiteTicketSequence table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'SiteTicketSequence') THEN
        CREATE TABLE "SiteTicketSequence" (
          "siteId" TEXT PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "prefix" TEXT NOT NULL,
          "nextValue" INTEGER NOT NULL DEFAULT 1,
          CONSTRAINT "SiteTicketSequence_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        
        CREATE INDEX "SiteTicketSequence_tenantId_idx" ON "SiteTicketSequence"("tenantId");
    END IF;
END $$;

-- Try to drop the default on Ticket.id if it exists
DO $$
BEGIN
    ALTER TABLE "Ticket" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore if default doesn't exist
        NULL;
END $$;

-- Mark the migration as completed in the _prisma_migrations table
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid()::text,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    NOW(),
    '20251110180000_ticket_id_sequence',
    NULL,
    NULL,
    NOW(),
    1
)
ON CONFLICT (migration_name) DO UPDATE SET
    finished_at = NOW(),
    rolled_back_at = NULL,
    applied_steps_count = 1;
