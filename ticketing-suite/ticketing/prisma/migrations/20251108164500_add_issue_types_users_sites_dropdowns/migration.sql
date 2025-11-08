-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- AlterTable: Add password and role to User
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable: Change User email from unique per tenant to globally unique
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_email_key";
ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");

-- CreateTable: IssueType
CREATE TABLE "IssueType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IssueType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssueType_tenantId_key_key" ON "IssueType"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "IssueType" ADD CONSTRAINT "IssueType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Add relation from Ticket to User
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
