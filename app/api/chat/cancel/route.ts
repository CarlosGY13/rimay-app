import { NextResponse } from "next/server";
import { Channel } from "@prisma/client";
import {
  getSession as getConversation,
  addMessage,
  cancelSession,
  conversationTenantId,
  conversationRouting,
} from "@/lib/conversationStore";
import { requireSession } from "@/lib/auth/session";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Mensaje de despedida al cancelar un pedido. Predeterminado (no IA): es un
// cierre claro y cálido, no algo que convenga dejar a generación libre.
const DESPEDIDA_CANCELACION =
  "Lamentablemente no vamos a poder concretar tu pedido esta vez. " +
  "¡Disculpá las molestias y gracias por escribirnos! Cuando quieras podés " +
  "volver a escribirnos y con gusto te atendemos de nuevo.";

// El operador cancela una conversación: se le envía al cliente un mensaje de
// despedida y la conversación se marca como cancelada (terminal). Si el cliente
// vuelve a escribir, arranca una sesión nueva.
export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId es obligatorio." },
        { status: 400 }
      );
    }

    const ownerTenant = await conversationTenantId(sessionId);
    if (!ownerTenant) {
      return NextResponse.json(
        { error: "Conversación no encontrada." },
        { status: 404 }
      );
    }
    if (ownerTenant !== session.tenantId) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const conv = await getConversation(sessionId);
    if (!conv) {
      return NextResponse.json(
        { error: "Conversación no encontrada." },
        { status: 404 }
      );
    }

    // Registrar y entregar el mensaje de despedida.
    await addMessage(sessionId, "agent", DESPEDIDA_CANCELACION);
    const routing = await conversationRouting(sessionId);
    if (routing?.channel === Channel.telegram && routing.externalId) {
      await sendTelegramMessage(routing.externalId, DESPEDIDA_CANCELACION);
    }

    // Marcar como cancelada (terminal).
    await cancelSession(sessionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/chat/cancel error:", e);
    return NextResponse.json(
      { error: "No se pudo cancelar la conversación." },
      { status: 500 }
    );
  }
}
