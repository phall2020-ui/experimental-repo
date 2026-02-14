-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailNotifications" JSONB NOT NULL DEFAULT '{"ticketCreated":true,"ticketUpdated":true,"ticketAssigned":true,"ticketCommented":true,"ticketResolved":true}';
