import { NextResponse } from "next/server";
import { generarRespuestaMock } from "@/lib/mockAgent";
import {
  getOrCreateSession,
  addMessage,
  markNeedsReview,
  updateOrderInfo,
} from "@/lib/conversationStore";
import type { BusinessConfig } from "@/lib/types";
import catalogData from "@/data/catalog.json";
import { enforceRateLimit } from "@/lib/rateLimit";

// Build a BusinessConfig from the static catalog.json for server-side use.
const SERVER_CONFIG: BusinessConfig = {
  rubro: "restaurante",
  nombre: catalogData.negocio,
  tono: "cercano",
  canales: { whatsapp: false, instagram: false, facebook: false, web: true },
  catalogo: [
    ...catalogData.items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
    })),
    ...catalogData.extras.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
    })),
  ],
  reglas: catalogData.reglas,
  cartaFileName: null,
  deliveryMode: "automatico",
  paymentMethods: [],
  zonas: [],
};

export async function POST(request: Request) {
  // Chat público: sin token de operador, pero con rate limiting por IP.
  const limited = enforceRateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { sessionId, message } = body as {
      sessionId?: string;
      message?: string;
    };

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "El campo 'message' es obligatorio." },
        { status: 400 }
      );
    }

    const session = await getOrCreateSession(sessionId);
    await addMessage(session.id, "user", message.trim());

    // If session is paused (operator took over), store message but don't auto-respond.
    if (session.paused) {
      return NextResponse.json({
        sessionId: session.id,
        texto: null,
        order: null,
        needs_human_review: false,
        paused: true,
      });
    }

    const response = generarRespuestaMock(message.trim(), SERVER_CONFIG);

    await addMessage(session.id, "agent", response.texto);

    if (response.needs_human_review) {
      await markNeedsReview(session.id);
    }

    if (response.order) {
      const resumen = response.order.items.map((i) => i.nombre).join(", ");
      await updateOrderInfo(session.id, resumen, response.order.total, {
        items: response.order.items,
        total: response.order.total,
      });
    }

    return NextResponse.json({
      sessionId: session.id,
      texto: response.texto,
      order: response.order,
      needs_human_review: response.needs_human_review,
      paused: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Error procesando el mensaje." },
      { status: 500 }
    );
  }
}
