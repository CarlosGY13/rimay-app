-- AlterEnum
ALTER TYPE "Channel" ADD VALUE 'telegram';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "external_id" TEXT;

-- CreateIndex
CREATE INDEX "conversations_tenant_id_channel_external_id_idx" ON "conversations"("tenant_id", "channel", "external_id");
