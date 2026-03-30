-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_ASSIGNED', 'TICKET_COMMENTED', 'TICKET_RESOLVED', 'RECURRING_TICKET_GENERATED');

-- CreateTable
CREATE TABLE "RecurringTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "details" TEXT,
    "assignedUserId" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "frequency" "RecurrenceFrequency" NOT NULL,
    "intervalValue" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TIMESTAMP(3),
    "nextScheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ticketId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringTicket_tenantId_isActive_nextScheduledAt_idx" ON "RecurringTicket"("tenantId", "isActive", "nextScheduledAt");

-- CreateIndex
CREATE INDEX "RecurringTicket_tenantId_siteId_idx" ON "RecurringTicket"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_isRead_createdAt_idx" ON "Notification"("tenantId", "userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_ticketId_idx" ON "Notification"("tenantId", "ticketId");
