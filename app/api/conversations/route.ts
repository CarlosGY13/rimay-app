import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbConversationToApp, appEstadoToDb, appCanalToDb } from "@/lib/tenant";
import { requireSession } from "@/lib/auth/session";
import type { Conversacion } from "@/lib/types";

export const dynamic = "force-dynamic";

// Lista las conversaciones del tenant de la sesión (widget + sandbox).
export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    const convs = await prisma.conversation.findMany({
      where: { tenantId: session.tenantId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ conversations: convs.map(dbConversationToApp) });
  } catch (e) {
    console.error("GET /api/conversations failed:", e);
    return NextResponse.json(
      { error: "No se pudieron cargar las conversaciones." },
      { status: 500 }
    );
  }
}

// Crea una conversación (sandbox: pedido confirmado o escalada a revisión).
export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    const body = (await request.json()) as Omit<Conversacion, "id">;

    const created = await prisma.conversation.create({
      data: {
        tenantId: session.tenantId,
        customerName: body.cliente || "Cliente web",
        channel: appCanalToDb(body.canal ?? "web"),
        status: appEstadoToDb(body.estado ?? "nuevo"),
        summary: body.resumen ?? "",
        totalAmount: body.total && body.total > 0 ? body.total : null,
      },
      include: { messages: true },
    });

    return NextResponse.json(dbConversationToApp(created), { status: 201 });
  } catch (e) {
    console.error("POST /api/conversations failed:", e);
    return NextResponse.json(
      { error: "No se pudo crear la conversación." },
      { status: 500 }
    );
  }
}
