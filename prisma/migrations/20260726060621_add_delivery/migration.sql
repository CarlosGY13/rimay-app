-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('automatico', 'confirmacion');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "delivery_mode" "DeliveryMode" NOT NULL DEFAULT 'automatico',
ADD COLUMN     "payment_methods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_zones_tenant_id_idx" ON "delivery_zones"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_tenant_id_distrito_key" ON "delivery_zones"("tenant_id", "distrito");

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
