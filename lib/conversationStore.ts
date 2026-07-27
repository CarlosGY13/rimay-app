import {
  Prisma,
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

// Pedido estructurado tal como se persiste en Conversation.orderData. Los
// campos de delivery son opcionales porque los pedidos web (mock) no los traen.
export type StoredOrder = {
  items: { nombre: string; precio: number }[];
  total: number;
  tipoEntrega?: "recojo" | "delivery" | null;
  distrito?: string | null;
  direccion?: string | null;
  envio?: number | null;
  metodoPago?: string | null;
};

export type WidgetSession = {
  id: string;
  mensajes: WidgetMessage[];
  resumen: string;
  total: number;
  estado: EstadoConversacion;
  paused: boolean;
  order: StoredOrder | null;
  updatedAt: number;
};

// Estados terminales: la conversación se cerró (pedido completado o cancelado).
// El próximo mensaje del cliente arranca una sesión nueva.
function isTerminal(status: DbStatus): boolean {
  return status === DbStatus.completado || status === DbStatus.cancelado;
}

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
    order: (conv.orderData as StoredOrder | null) ?? null,
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
    // Si la sesión existe y NO está cerrada, la reutilizamos. Si ya terminó
    // (completada/cancelada), creamos una nueva (el widget adoptará el id nuevo
    // que devolvemos), así el cliente empieza de cero.
    if (existing && !isTerminal(existing.status)) return toWidgetSession(existing);
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

// Devuelve el tenantId dueño de una conversación (o null si no existe).
export async function conversationTenantId(
  sessionId: string
): Promise<string | null> {
  const conv = await prisma.conversation.findUnique({
    where: { id: sessionId },
    select: { tenantId: true },
  });
  return conv?.tenantId ?? null;
}

// Devuelve el canal y el id externo (ej. chat_id de Telegram) de una
// conversación, para saber por dónde entregar la respuesta del operador.
export async function conversationRouting(
  sessionId: string
): Promise<{ channel: DbChannel; externalId: string | null } | null> {
  const conv = await prisma.conversation.findUnique({
    where: { id: sessionId },
    select: { channel: true, externalId: true },
  });
  return conv ?? null;
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

export async function markNeedsReview(
  sessionId: string,
  reason?: string
): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: {
      status: DbStatus.requiere_revision,
      // Guarda el motivo en el resumen para que el operador lo vea en el inbox.
      ...(reason && reason.trim().length > 0 ? { summary: reason.trim() } : {}),
    },
  });
}

// Busca (o crea) la conversación asociada a un chat externo (ej. Telegram),
// correlacionada por tenant + canal + externalId. Devuelve id y si está pausada
// (operador en control).
export async function getOrCreateExternalConversation(params: {
  channel: DbChannel;
  externalId: string;
  customerName: string;
}): Promise<{ id: string; paused: boolean }> {
  const tenantId = await getFixedTenantId();
  // Tomamos la conversación MÁS RECIENTE de ese chat. Si ya terminó
  // (completada o cancelada), NO la reutilizamos: arrancamos una sesión nueva,
  // así el agente no arrastra el historial de un pedido ya cerrado.
  const latest = await prisma.conversation.findFirst({
    where: {
      tenantId,
      channel: params.channel,
      externalId: params.externalId,
    },
    orderBy: { createdAt: "desc" },
  });
  if (latest && !isTerminal(latest.status)) {
    return {
      id: latest.id,
      paused: latest.status === DbStatus.en_preparacion,
    };
  }

  const created = await prisma.conversation.create({
    data: {
      tenantId,
      customerName: params.customerName,
      channel: params.channel,
      externalId: params.externalId,
      status: DbStatus.nuevo,
      summary: "",
    },
  });
  return { id: created.id, paused: false };
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

// Devuelve el control a la IA dejando la conversación activa (no pausada, no
// cerrada), para que el agente siga respondiendo los próximos mensajes.
export async function resumeSession(sessionId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: { status: DbStatus.nuevo },
  });
}

// Marca la conversación como cancelada (terminal). El próximo mensaje del
// cliente arrancará una sesión nueva.
export async function cancelSession(sessionId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: { status: DbStatus.cancelado },
  });
}

export async function updateOrderInfo(
  sessionId: string,
  resumen: string,
  total: number,
  order?: StoredOrder | null
): Promise<void> {
  await prisma.conversation.update({
    where: { id: sessionId },
    data: {
      summary: resumen,
      totalAmount: total,
      // Solo tocamos orderData si nos pasan el pedido estructurado.
      ...(order !== undefined
        ? { orderData: (order ?? Prisma.JsonNull) as Prisma.InputJsonValue }
        : {}),
    },
  });
}

// Sugiere la tarifa de envío para una conversación: si su pedido es delivery a
// un distrito que está en la tabla de zonas del tenant, devuelve esa tarifa.
// Sirve para precargar el campo de confirmación del operador.
export async function suggestedDeliveryFee(
  sessionId: string
): Promise<number | null> {
  const conv = await prisma.conversation.findUnique({
    where: { id: sessionId },
    select: { tenantId: true, orderData: true },
  });
  if (!conv) return null;

  const order = (conv.orderData as StoredOrder | null) ?? null;
  const distrito = order?.distrito?.trim();
  if (!distrito) return null;

  const zone = await prisma.deliveryZone.findFirst({
    where: {
      tenantId: conv.tenantId,
      distrito: { equals: distrito, mode: "insensitive" },
    },
    select: { fee: true },
  });
  return zone ? Number(zone.fee) : null;
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
