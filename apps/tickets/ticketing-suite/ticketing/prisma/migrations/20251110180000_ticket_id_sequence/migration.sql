-- Drop default UUID generation for ticket IDs; IDs will now be allocated manually.
DO $$
BEGIN
    ALTER TABLE "Ticket" ALTER COLUMN "id" DROP DEFAULT;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if already dropped
END $$;

-- Create per-site ticket sequence table to track next ticket numbers and stable prefixes.
CREATE TABLE IF NOT EXISTS "SiteTicketSequence" (
  "siteId" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "SiteTicketSequence_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SiteTicketSequence_tenantId_idx" ON "SiteTicketSequence"("tenantId");

