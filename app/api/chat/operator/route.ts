import { NextResponse } from "next/server";
import { Channel } from "@prisma/client";
import {
  getSession as getConversation,
  addMessage,
  pauseSession,
  conversationTenantId,
  conversationRouting,
} from "@/lib/conversationStore";
import { requireSession } from "@/lib/auth/session";
import { sendTelegramMessage } from "@/lib/telegram";

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

    // Si viene un mensaje del operador, lo agrega al historial y —según el
    // canal— lo entrega al cliente. En web el cliente lo lee por polling; en
    // Telegram hay que empujarlo por la Bot API (no hace polling).
    if (message && message.trim().length > 0) {
      const texto = message.trim();
      await addMessage(sessionId, "operator", texto);

      const routing = await conversationRouting(sessionId);
      if (routing?.channel === Channel.telegram && routing.externalId) {
        await sendTelegramMessage(routing.externalId, texto);
      }
    }

    // Re-lee el estado actualizado (mensajes + paused) para devolverlo.
    const updated = (await getConversation(sessionId)) ?? conv;

    return NextResponse.json({
      sessionId: updated.id,
      mensajes: updated.mensajes,
      estado: updated.estado,
      paused: updated.paused,
      resumen: updated.resumen,
    });
  } catch {
    return NextResponse.json(
      { error: "Error procesando el mensaje del operador." },
      { status: 500 }
    );
  }
}
