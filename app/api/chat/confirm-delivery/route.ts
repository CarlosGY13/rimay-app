import { NextResponse } from "next/server";
import { Channel } from "@prisma/client";
import {
  getSession as getConversation,
  addMessage,
  updateOrderInfo,
  resumeSession,
  conversationTenantId,
  conversationRouting,
  type StoredOrder,
} from "@/lib/conversationStore";
import { requireSession } from "@/lib/auth/session";
import { buildOrderSummary } from "@/lib/ai/orderSummary";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Cierre PREDETERMINADO (sin IA): al confirmar el envío, el total y el costo son
// datos exactos, así que armamos el mensaje con plantilla. Es más confiable y no
// gasta llamadas al modelo. La regla de "no inventar precios" se respeta: el
// envío lo pone la persona y el total se calcula, no lo genera la IA.
function buildClosingMessage(params: {
  fee: number;
  total: number;
  distrito: string | null;
  direccion: string | null;
  metodoPago: string | null;
}): string {
  const { fee, total, distrito, direccion, metodoPago } = params;
  const destino = distrito
    ? ` a ${distrito}${direccion ? ` (${direccion})` : ""}`
    : "";
  const pago = metodoPago ? ` El pago sería con ${metodoPago}.` : "";
  return (
    `¡Listo! Ya confirmamos tu envío${destino}. ` +
    `El costo de delivery es S/ ${fee.toFixed(2)} y tu total queda en S/ ${total.toFixed(2)}.${pago} ` +
    `Lo preparamos y sale en camino. ¡Gracias por tu compra!`
  );
}

// El operador confirma el costo de envío de un pedido que estaba esperando
// validación de ubicación (modo "confirmación"). Se le envía al cliente un
// cierre predeterminado con el envío y el total, y la conversación vuelve al
// control de la IA.
export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      fee?: number;
    };

    const sessionId = body.sessionId;
    const fee = typeof body.fee === "number" ? body.fee : NaN;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId es obligatorio." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(fee) || fee < 0) {
      return NextResponse.json(
        { error: "El costo de envío debe ser un número válido (>= 0)." },
        { status: 400 }
      );
    }

    // La conversación debe pertenecer al tenant de la sesión.
    const ownerTenant = await conversationTenantId(sessionId);
    if (!ownerTenant) {
      return NextResponse.json(
        { error: "Conversación no encontrada." },
        { status: 404 }
      );
    }
    if (ownerTenant !== session.tenantId) {
      return NextResponse.json(
        { error: "No autorizado para esta conversación." },
        { status: 403 }
      );
    }

    const conv = await getConversation(sessionId);
    if (!conv) {
      return NextResponse.json(
        { error: "Conversación no encontrada." },
        { status: 404 }
      );
    }

    // Total de ítems: del pedido estructurado si existe; si no, del total
    // guardado (en modo confirmación el envío venía en null, así que el total
    // guardado es solo la suma de ítems).
    const prev = conv.order;
    const itemsTotal =
      prev && prev.items.length > 0
        ? prev.items.reduce((s, i) => s + i.precio, 0)
        : conv.total;
    const total = itemsTotal + fee;

    const distrito = prev?.distrito ?? null;
    const direccion = prev?.direccion ?? null;
    const metodoPago = prev?.metodoPago ?? null;

    const mensaje = buildClosingMessage({
      fee,
      total,
      distrito,
      direccion,
      metodoPago,
    });

    // Pedido actualizado con el envío confirmado y el total final.
    const nuevoOrder: StoredOrder = {
      items: prev?.items ?? [],
      total,
      tipoEntrega: "delivery",
      distrito,
      direccion,
      envio: fee,
      metodoPago,
    };

    await addMessage(sessionId, "agent", mensaje);
    await updateOrderInfo(sessionId, buildOrderSummary(nuevoOrder), total, nuevoOrder);

    // Entrega al cliente: en Telegram hay que empujar el mensaje; en web lo lee
    // por polling.
    const routing = await conversationRouting(sessionId);
    if (routing?.channel === Channel.telegram && routing.externalId) {
      await sendTelegramMessage(routing.externalId, mensaje);
    }

    // Devolver el control a la IA (deja de estar pausada por el operador).
    await resumeSession(sessionId);

    const updated = (await getConversation(sessionId)) ?? conv;
    return NextResponse.json({
      sessionId: updated.id,
      mensajes: updated.mensajes,
      estado: updated.estado,
      paused: updated.paused,
      resumen: updated.resumen,
    });
  } catch (e) {
    console.error("POST /api/chat/confirm-delivery error:", e);
    return NextResponse.json(
      { error: "No se pudo confirmar el envío." },
      { status: 500 }
    );
  }
}
