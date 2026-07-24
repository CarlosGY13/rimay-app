import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getFixedTenant,
  dbConversationToApp,
  appEstadoToDb,
  appCanalToDb,
} from "@/lib/tenant";
import type { Conversacion } from "@/lib/types";

export const dynamic = "force-dynamic";

// Lista todas las conversaciones del tenant fijo (widget + sandbox), mapeadas
// a la forma que consume el inbox.
export async function GET() {
  try {
    const tenant = await getFixedTenant();
    const convs = await prisma.conversation.findMany({
      where: { tenantId: tenant.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });

    const conversations = convs.map(dbConversationToApp);
    return NextResponse.json({ conversations });
  } catch (e) {
    console.error("GET /api/conversations failed:", e);
    return NextResponse.json(
      { error: "No se pudieron cargar las conversaciones." },
      { status: 500 }
    );
  }
}

// Crea una conversación (usado por el sandbox: pedido confirmado o escalada).
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Omit<Conversacion, "id">;

    const tenant = await getFixedTenant();
    const created = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
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
