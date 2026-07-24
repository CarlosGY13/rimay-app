import { NextResponse } from "next/server";
import { getSession } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId es obligatorio." },
      { status: 400 }
    );
  }

  const session = await getSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: "Sesión no encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    mensajes: session.mensajes,
    estado: session.estado,
    paused: session.paused,
    // Motivo/resumen (p. ej. por qué se escaló a revisión). Útil cuando la
    // conversación no tiene mensajes (caso escalado desde el sandbox).
    resumen: session.resumen,
  });
}
