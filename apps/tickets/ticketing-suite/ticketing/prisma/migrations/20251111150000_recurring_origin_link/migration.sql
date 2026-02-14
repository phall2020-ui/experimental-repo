-- Add origin ticket relation to recurring tickets
-- Add origin ticket relation to recurring tickets
ALTER TABLE "RecurringTicket"
ADD COLUMN "originTicketId" TEXT;

CREATE UNIQUE INDEX "RecurringTicket_originTicketId_key" ON "RecurringTicket"("originTicketId") WHERE "originTicketId" IS NOT NULL;

ALTER TABLE "RecurringTicket"
ADD CONSTRAINT "RecurringTicket_originTicketId_fkey"
FOREIGN KEY ("originTicketId") REFERENCES "Ticket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

