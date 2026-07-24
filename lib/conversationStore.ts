import {
  Channel as DbChannel,
  ConversationStatus as DbStatus,
  type Conversation,
  type Message,
} from "@prisma/client";
import { prisma } from "./db";
import {
  getFixedTenantId,
  senderToRole,
  roleToSender,
  dbEstadoToApp,
  type WidgetRole,
} from "./tenant";
import type { EstadoConversacion } from "./types";

// ============================================================
// Store de conversaciones — respaldado por Postgres (tabla Conversation
// + Message) a través de Prisma. Reemplaza al Map en memoria anterior.
//
// La forma pública (WidgetSession) y los nombres de las funciones se
// mantienen para no romper a las rutas que ya las consumen; la única
// diferencia es que ahora son asíncronas.
// ============================================================

export type WidgetMessage = {
  role: WidgetRole;
  texto: string;
};

export type WidgetSession = {
  id: string;
  mensajes: WidgetMessage[];
  resumen: string;
  total: number;
  estado: EstadoConversacion;
  paused: boolean;
  updatedAt: number;
};

function toWidgetSession(
  conv: Conversation & { messages: Message[] }
): WidgetSession {
  return {
    id: conv.id,
    mensajes: conv.messages.map((m) => ({
      role: senderToRole(m.sender),
      texto: m.content,
    })),
    resumen: conv.summary ?? "",
    total: conv.totalAmount ? Number(conv.totalAmount) : 0,
    estado: dbEstadoToApp(conv.status),
    // "pausado" (operador en control) se deriva del estado en_preparacion.
    paused: conv.status === DbStatus.en_preparacion,
    updatedAt: conv.updatedAt.getTime(),
  };
}

export async function getOrCreateSession(
  sessionId?: string
): Promise<WidgetSession> {
  if (sessionId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (existing) return toWidgetSession(existing);
  }

  const tenantId = await getFixedTenantId();
  const created = await prisma.conversation.create({
    data: {
      tenantId,
      customerName: "Cliente web",
      channel: DbChannel.web,
      status: DbStatus.nuevo,
      summary: "",
    },
    include: { messages: true },
  });
  return toWidgetSession(created);
}

export async function getSession(
  sessionId: string
): Promise<WidgetSession | undefined> {
  const conv = await prisma.conversation.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return conv ? toWidgetSession(conv) : undefined;
}

export async function addMessage(
  sessionId: string,
  role: WidgetRole,
  texto: string
): Promise<void> {
  await prisma.message.create({
    data: { conversationId: sessionId, sender: roleToSender(role), content: texto },
  });
  // Toca la conversación para refrescar updatedAt (orden del inbox).
  await prisma.conversation.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });
}

export async function markNeedsReview(sessionId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: { status: DbStatus.requiere_revision },
  });
}

export async function pauseSession(sessionId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: { status: DbStatus.en_preparacion },
  });
}

export async function releaseSession(sessionId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: { status: DbStatus.completado },
  });
}

export async function updateOrderInfo(
  sessionId: string,
  resumen: string,
  total: number
): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: { summary: resumen, totalAmount: total },
  });
}

export async function getAllSessions(): Promise<WidgetSession[]> {
  const tenantId = await getFixedTenantId();
  const convs = await prisma.conversation.findMany({
    where: { tenantId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return convs.map(toWidgetSession);
}
