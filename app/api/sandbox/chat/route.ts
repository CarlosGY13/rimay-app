import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getFixedTenant,
  dbRubroToApp,
  dbTonoToApp,
  dbCatalogItemToApp,
} from "@/lib/tenant";
import { generarRespuestaIA } from "@/lib/ai/engine";
import type { AIMessage, AIBusinessContext } from "@/lib/ai/provider";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Límite de mensajes de historial que se pasan como contexto al modelo.
const MAX_HISTORY = 10;

// Motor de IA real del sandbox: arma el contexto del negocio desde Postgres,
// llama al proveedor configurado (OpenAI/Gemini) con salida estructurada y
// devuelve { reply, needsHumanReview, reviewReason }.
export async function POST(request: Request) {
  // Chat público (alimenta el sandbox): rate limiting por IP para no gastar
  // crédito de la API de IA de forma abusiva.
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      message?: string;
      history?: AIMessage[];
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        { error: "El campo 'message' es obligatorio." },
        { status: 400 }
      );
    }

    const tenant = await getFixedTenant();
    const [catalogo, reglas] = await Promise.all([
      prisma.catalogItem.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.businessRule.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const business: AIBusinessContext = {
      nombre: tenant.name.trim().length > 0 ? tenant.name : "el negocio",
      rubro: dbRubroToApp(tenant.rubro),
      tono: dbTonoToApp(tenant.tono),
      catalogo: catalogo.map((c) => {
        const item = dbCatalogItemToApp(c);
        return {
          nombre: item.nombre,
          precio: item.precio,
          descripcion: item.descripcion,
          categoria: item.categoria,
          tallas: item.tallas,
          color: item.color,
          duracion: item.duracion,
        };
      }),
      reglas: reglas.map((r) => r.text),
    };

    const history = Array.isArray(body.history)
      ? body.history.slice(-MAX_HISTORY)
      : [];

    const res = await generarRespuestaIA({ message, history, business });

    return NextResponse.json({
      reply: res.text,
      needsHumanReview: res.needsHumanReview,
      reviewReason: res.reviewReason,
    });
  } catch (e) {
    console.error("POST /api/sandbox/chat failed:", e);
    // Fallback seguro incluso si falla la carga del contexto.
    return NextResponse.json({
      reply: "Dame un momento, ya te ayudo.",
      needsHumanReview: true,
      reviewReason: "Error interno al procesar el mensaje.",
    });
  }
}
