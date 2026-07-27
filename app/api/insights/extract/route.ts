import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { dbRubroToApp } from "@/lib/tenant";
import { getProvider } from "@/lib/ai/getProvider";
import {
  buildInsightExtractionPrompt,
  buildInsightAggregationPrompt,
  parseInsightOutput,
  parseAggregationOutput,
  OPENAI_INSIGHT_EXTRACTION_SCHEMA,
  OPENAI_INSIGHT_AGGREGATION_SCHEMA,
  type InsightExtractionInput,
  type AggregationInput,
} from "@/lib/ai/insights";
import { generateStructuredInsight } from "@/lib/ai/insightEngine";

export const dynamic = "force-dynamic";

// Timeout para las llamadas de IA (cada una).
const TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("AI insight timeout")), ms)
    ),
  ]);
}

export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const body = (await request.json()) as { conversationId?: string };
    const conversationId = body.conversationId?.trim();

    if (!conversationId) {
      return NextResponse.json(
        { error: "El campo 'conversationId' es obligatorio." },
        { status: 400 }
      );
    }

    // Verificar que la conversación existe y pertenece al tenant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversación no encontrada." },
        { status: 404 }
      );
    }

    if (conversation.tenantId !== session.tenantId) {
      return NextResponse.json(
        { error: "No tenés acceso a esta conversación." },
        { status: 403 }
      );
    }

    // Idempotencia: si ya existe un insight para esta conversación, devolverlo
    const existing = await prisma.conversationInsight.findUnique({
      where: { conversationId },
    });

    if (existing) {
      return NextResponse.json({
        insight: {
          id: existing.id,
          summary: existing.summary,
          tags: existing.tags,
          hadFriction: existing.hadFriction,
        },
        aggregationUpdated: false,
      });
    }

    // Validar que hay mensajes
    if (conversation.messages.length === 0) {
      return NextResponse.json(
        { error: "La conversación no tiene mensajes para analizar." },
        { status: 400 }
      );
    }

    // Cargar datos del tenant para el prompt
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
    });

    // 1. Extraer insight
    const senderToRole = (sender: string): "cliente" | "agente" | "operador" => {
      switch (sender) {
        case "cliente": return "cliente";
        case "agente": return "agente";
        case "operador": return "operador";
        default: return "cliente";
      }
    };

    const extractionInput: InsightExtractionInput = {
      messages: conversation.messages.map((m) => ({
        role: senderToRole(m.sender),
        content: m.content,
      })),
      businessName: tenant.name || "el negocio",
      rubro: dbRubroToApp(tenant.rubro),
    };

    const extractionPrompt = buildInsightExtractionPrompt(extractionInput);

    const insightResult = await withTimeout(
      generateStructuredInsight(extractionPrompt, "extraction"),
      TIMEOUT_MS
    );

    const parsed = parseInsightOutput(insightResult);

    // 2. Guardar insight
    const created = await prisma.conversationInsight.create({
      data: {
        conversationId,
        tenantId: session.tenantId,
        summary: parsed.summary,
        tags: parsed.tags,
        hadFriction: parsed.hadFriction,
      },
    });

    // 3. Agregar: cargar últimos 20 insights y correr agregación
    let aggregationUpdated = false;

    try {
      const recentInsights = await prisma.conversationInsight.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const existingRules = await prisma.businessRule.findMany({
        where: { tenantId: session.tenantId },
        select: { text: true },
      });

      const aggregationInput: AggregationInput = {
        insights: recentInsights.map((ins) => ({
          summary: ins.summary,
          tags: ins.tags as string[],
        })),
        existingRules: existingRules.map((r) => r.text),
        businessName: tenant.name || "el negocio",
        rubro: dbRubroToApp(tenant.rubro),
      };

      const aggregationPrompt = buildInsightAggregationPrompt(aggregationInput);

      const aggregationResult = await withTimeout(
        generateStructuredInsight(aggregationPrompt, "aggregation"),
        TIMEOUT_MS
      );

      const aggregation = parseAggregationOutput(aggregationResult);

      await prisma.insightAggregation.upsert({
        where: { tenantId: session.tenantId },
        create: {
          tenantId: session.tenantId,
          themes: aggregation.themes,
          analyzedCount: recentInsights.length,
        },
        update: {
          themes: aggregation.themes,
          analyzedCount: recentInsights.length,
        },
      });

      aggregationUpdated = true;
    } catch (aggErr) {
      // La agregación falló pero el insight ya se guardó — no bloqueamos.
      console.error("[insights/extract] Aggregation failed:", aggErr);
    }

    return NextResponse.json({
      insight: {
        id: created.id,
        summary: created.summary,
        tags: created.tags,
        hadFriction: created.hadFriction,
      },
      aggregationUpdated,
    });
  } catch (e) {
    console.error("POST /api/insights/extract failed:", e);
    return NextResponse.json(
      { error: "No se pudo extraer el insight de la conversación." },
      { status: 500 }
    );
  }
}
