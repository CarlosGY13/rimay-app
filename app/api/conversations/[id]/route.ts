import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { conversationTenantId } from "@/lib/conversationStore";
import { appEstadoToDb } from "@/lib/tenant";
import type { EstadoConversacion } from "@/lib/types";

const ESTADOS_VALIDOS: EstadoConversacion[] = [
  "nuevo",
  "preparacion",
  "revision",
  "completado",
];

// Cambia el estado de una conversación (ej. marcar como resuelto = completado).
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  const owner = await conversationTenantId(params.id);
  if (!owner) {
    return NextResponse.json(
      { error: "Conversación no encontrada." },
      { status: 404 }
    );
  }
  if (owner !== session.tenantId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { estado?: EstadoConversacion };
    if (!body.estado || !ESTADOS_VALIDOS.includes(body.estado)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    await prisma.conversation.update({
      where: { id: params.id },
      data: { status: appEstadoToDb(body.estado) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/conversations/[id] failed:", e);
    return NextResponse.json(
      { error: "No se pudo actualizar la conversación." },
      { status: 500 }
    );
  }
}

// Descarta (elimina) una conversación del inbox.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { session, response } = await requireSession();
  if (response) return response;

  const owner = await conversationTenantId(params.id);
  if (!owner) {
    // Ya no existe: lo tratamos como éxito (idempotente).
    return NextResponse.json({ ok: true });
  }
  if (owner !== session.tenantId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    await prisma.conversation.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/conversations/[id] failed:", e);
    return NextResponse.json(
      { error: "No se pudo descartar la conversación." },
      { status: 500 }
    );
  }
}
