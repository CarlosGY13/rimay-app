-- CreateTable
CREATE TABLE "conversation_insights" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "had_friction" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_aggregations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "themes" JSONB NOT NULL,
    "analyzed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_aggregations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_insights_conversation_id_key" ON "conversation_insights"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_insights_tenant_id_created_at_idx" ON "conversation_insights"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "insight_aggregations_tenant_id_key" ON "insight_aggregations"("tenant_id");

-- AddForeignKey
ALTER TABLE "conversation_insights" ADD CONSTRAINT "conversation_insights_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_insights" ADD CONSTRAINT "conversation_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_aggregations" ADD CONSTRAINT "insight_aggregations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
