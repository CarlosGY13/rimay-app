import { NextResponse } from "next/server";
import { resumeSession, conversationTenantId } from "@/lib/conversationStore";
import { requireSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  // Ruta sensible: requiere sesión de dueño y que la conversación sea suya.
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId?: string };

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
      return NextResponse.json(
        { error: "No autorizado para esta conversación." },
        { status: 403 }
      );
    }

    // "Devolver a IA": reactiva la conversación (activa, no cerrada) para que el
    // agente siga respondiendo CON el historial. NO la cerramos: cerrar la
    // marcaría como terminal y el próximo mensaje arrancaría una sesión nueva,
    // perdiendo el contexto del pedido en curso.
    await resumeSession(sessionId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error devolviendo la sesión a la IA." },
      { status: 500 }
    );
  }
}
