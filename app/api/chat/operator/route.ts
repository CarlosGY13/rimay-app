import { NextResponse } from "next/server";
import {
  getSession as getConversation,
  addMessage,
  pauseSession,
  conversationTenantId,
} from "@/lib/conversationStore";
import { requireSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  // Ruta sensible: requiere sesión de dueño y que la conversación sea suya.
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const body = await request.json();
    const { sessionId, message } = body as {
      sessionId?: string;
      message?: string | null;
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId es obligatorio." },
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

    // Pausa la IA si no lo estaba.
    if (!conv.paused) {
      await pauseSession(sessionId);
    }

    // Si viene un mensaje del operador, lo agrega al historial.
    if (message && message.trim().length > 0) {
      await addMessage(sessionId, "operator", message.trim());
    }

    // Re-lee el estado actualizado (mensajes + paused) para devolverlo.
    const updated = (await getConversation(sessionId)) ?? conv;

    return NextResponse.json({
      sessionId: updated.id,
      mensajes: updated.mensajes,
      estado: updated.estado,
      paused: updated.paused,
    });
  } catch {
    return NextResponse.json(
      { error: "Error procesando el mensaje del operador." },
      { status: 500 }
    );
  }
}
