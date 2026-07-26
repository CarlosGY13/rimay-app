import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Devuelve la agregación de insights actual para el tenant autenticado.
export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const aggregation = await prisma.insightAggregation.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!aggregation) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      themes: aggregation.themes,
      analyzedCount: aggregation.analyzedCount,
      updatedAt: aggregation.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("GET /api/insights/aggregation failed:", e);
    return NextResponse.json(
      { error: "No se pudo cargar la agregación de insights." },
      { status: 500 }
    );
  }
}
