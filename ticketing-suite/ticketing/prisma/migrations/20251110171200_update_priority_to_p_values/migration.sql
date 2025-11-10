-- AlterEnum: Update TicketPriority enum from High/Medium/Low to P1/P2/P3/P4

-- Create new enum type with P values
CREATE TYPE "TicketPriority_new" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- Update existing tickets to map old values to new values
-- High -> P1, Medium -> P2, Low -> P3
ALTER TABLE "Ticket" 
  ALTER COLUMN "priority" TYPE "TicketPriority_new" 
  USING (
    CASE "priority"::text
      WHEN 'High' THEN 'P1'
      WHEN 'Medium' THEN 'P2'
      WHEN 'Low' THEN 'P3'
      ELSE 'P2' -- default to P2 for any unexpected values
    END
  )::"TicketPriority_new";

-- Drop old enum
DROP TYPE "TicketPriority";

-- Rename new enum to original name
ALTER TYPE "TicketPriority_new" RENAME TO "TicketPriority";
