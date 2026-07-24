import { NextResponse } from "next/server";
import {
  getSession,
  addMessage,
  pauseSession,
} from "@/lib/conversationStore";

export async function POST(request: Request) {
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

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada." },
        { status: 404 }
      );
    }

    // Pause AI if not already paused
    if (!session.paused) {
      pauseSession(sessionId);
    }

    // If message is provided, add it to history
    if (message && message.trim().length > 0) {
      addMessage(sessionId, "operator", message.trim());
    }

    return NextResponse.json({
      sessionId: session.id,
      mensajes: session.mensajes,
      estado: session.estado,
      paused: session.paused,
    });
  } catch {
    return NextResponse.json(
      { error: "Error procesando el mensaje del operador." },
      { status: 500 }
    );
  }
}
