-- Add TicketTemplate table
CREATE TABLE "TicketTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "priority" "TicketPriority" NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "assignedUserId" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "RecurrenceFrequency",
    "intervalValue" INTEGER,
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "TicketTemplate_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "TicketTemplate_tenantId_idx" ON "TicketTemplate"("tenantId");
CREATE INDEX "TicketTemplate_tenantId_name_idx" ON "TicketTemplate"("tenantId", "name");

-- Add foreign key constraint
ALTER TABLE "TicketTemplate" ADD CONSTRAINT "TicketTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
