-- Add new notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET_ACTIVITY_DIGEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET_DUE_SOON';

-- Create notification digest table to track daily refreshes per user
CREATE TABLE IF NOT EXISTS "NotificationDigest" (
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDigest_pkey" PRIMARY KEY ("tenantId","userId")
);

CREATE INDEX IF NOT EXISTS "NotificationDigest_lastRunAt_idx"
    ON "NotificationDigest"("lastRunAt");

