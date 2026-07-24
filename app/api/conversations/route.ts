import { NextResponse } from "next/server";
import { getAllSessions } from "@/lib/conversationStore";
import type { Conversacion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = getAllSessions();

  const conversations: Conversacion[] = sessions.map((s) => {
    const minutosAtras = Math.max(
      0,
      Math.round((Date.now() - s.updatedAt) / 60000)
    );
    return {
      id: s.id,
      cliente: "Cliente web",
      resumen:
        s.resumen ||
        (s.mensajes.length > 0
          ? s.mensajes[s.mensajes.length - 1].texto.slice(0, 60)
          : "Sin mensajes"),
      total: s.total,
      minutosAtras,
      canal: "web" as const,
      estado: s.estado,
    };
  });

  return NextResponse.json({ conversations });
}
