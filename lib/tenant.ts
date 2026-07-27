import {
  Prisma,
  Rubro as DbRubro,
  Tono as DbTono,
  Channel as DbChannel,
  ConversationStatus as DbStatus,
  Sender as DbSender,
  type Tenant,
  type CatalogItem,
  type Conversation,
  type Message,
} from "@prisma/client";
import { prisma } from "./db";
import type {
  Rubro,
  Tono,
  CatalogItem as AppCatalogItem,
  Conversacion,
  EstadoConversacion,
  CanalOrigen,
} from "./types";

// ============================================================
// Tenant fijo
//
// Por ahora operamos con un único tenant (el del seed, o el primero
// que exista). El login/selección por usuario es una tarea posterior.
// Si no hay ninguno (DB migrada pero sin seed), creamos uno por defecto
// para que la app no se rompa.
// ============================================================

const DEFAULT_TENANT = {
  name: "",
  slug: "rimay-demo",
  rubro: DbRubro.generico,
  tono: DbTono.cercano,
};

export async function getFixedTenant(): Promise<Tenant> {
  const existing = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.tenant.create({ data: DEFAULT_TENANT });
}

export async function getFixedTenantId(): Promise<string> {
  const tenant = await getFixedTenant();
  return tenant.id;
}

// ============================================================
// Mapeo de Rubro (app <-> DB)
//
// La app maneja 5 rubros; el enum de la DB agrupa "ropa" en
// tienda_ropa y "veterinaria"/"belleza" en veterinaria_belleza.
// El mapeo inverso es por lo tanto lossy: veterinaria_belleza vuelve
// como "veterinaria". No afecta el comportamiento del Portal porque
// veterinaria y belleza comparten los mismos campos de catálogo.
// ============================================================

export function appRubroToDb(r: Rubro): DbRubro {
  switch (r) {
    case "restaurante":
      return DbRubro.restaurante;
    case "ropa":
      return DbRubro.tienda_ropa;
    case "veterinaria":
    case "belleza":
      return DbRubro.veterinaria_belleza;
    case "generico":
    default:
      return DbRubro.generico;
  }
}

export function dbRubroToApp(r: DbRubro): Rubro {
  switch (r) {
    case DbRubro.restaurante:
      return "restaurante";
    case DbRubro.tienda_ropa:
      return "ropa";
    case DbRubro.veterinaria_belleza:
      return "veterinaria";
    case DbRubro.generico:
    default:
      return "generico";
  }
}

export function appTonoToDb(t: Tono): DbTono {
  return DbTono[t];
}

export function dbTonoToApp(t: DbTono): Tono {
  return t as Tono;
}

// ============================================================
// Estado de conversación (app <-> DB)
// ============================================================

export function appEstadoToDb(e: EstadoConversacion): DbStatus {
  switch (e) {
    case "nuevo":
      return DbStatus.nuevo;
    case "preparacion":
      return DbStatus.en_preparacion;
    case "revision":
      return DbStatus.requiere_revision;
    case "preparando":
      return DbStatus.preparando;
    case "cancelado":
      return DbStatus.cancelado;
    case "completado":
    default:
      return DbStatus.completado;
  }
}

export function dbEstadoToApp(s: DbStatus): EstadoConversacion {
  switch (s) {
    case DbStatus.nuevo:
      return "nuevo";
    case DbStatus.en_preparacion:
      return "preparacion";
    case DbStatus.requiere_revision:
      return "revision";
    case DbStatus.preparando:
      return "preparando";
    case DbStatus.cancelado:
      return "cancelado";
    case DbStatus.completado:
    default:
      return "completado";
  }
}

// ============================================================
// Canal (app <-> DB)
// ============================================================

export function appCanalToDb(c: CanalOrigen): DbChannel {
  return DbChannel[c];
}

export function dbCanalToApp(c: DbChannel): CanalOrigen {
  // La app solo usa web/whatsapp/instagram; facebook cae a "web".
  if (c === DbChannel.facebook) return "web";
  return c as CanalOrigen;
}

// ============================================================
// Sender de mensaje (app <-> DB)
// ============================================================

export type WidgetRole = "user" | "agent" | "operator";

export function roleToSender(role: WidgetRole): DbSender {
  switch (role) {
    case "user":
      return DbSender.cliente;
    case "agent":
      return DbSender.agente;
    case "operator":
    default:
      return DbSender.operador;
  }
}

export function senderToRole(s: DbSender): WidgetRole {
  switch (s) {
    case DbSender.cliente:
      return "user";
    case DbSender.agente:
      return "agent";
    case DbSender.operador:
    default:
      return "operator";
  }
}

// ============================================================
// CatalogItem (DB -> app)
//
// name/price/description son columnas; los campos por rubro
// (categoria, tallas, color, duracion) viven en attributes (JSON).
// ============================================================

type CatalogAttributes = {
  categoria?: AppCatalogItem["categoria"];
  tallas?: string[];
  color?: string;
  duracion?: string;
  origen?: AppCatalogItem["origen"];
};

export function dbCatalogItemToApp(item: CatalogItem): AppCatalogItem {
  const attrs = (item.attributes ?? {}) as unknown as CatalogAttributes;
  return {
    id: item.id,
    nombre: item.name,
    precio: Number(item.price),
    descripcion: item.description ?? undefined,
    categoria: attrs.categoria,
    tallas: attrs.tallas,
    color: attrs.color,
    duracion: attrs.duracion,
    origen: attrs.origen,
  };
}

// Extrae los campos específicos de rubro para guardarlos como JSON.
// Devuelve InputJsonValue para encajar directo en el campo Json de Prisma.
export function appCatalogAttributes(
  data: Partial<AppCatalogItem>
): Prisma.InputJsonValue {
  const attrs: Record<string, unknown> = {};
  if (data.categoria) attrs.categoria = data.categoria;
  if (data.tallas && data.tallas.length > 0) attrs.tallas = data.tallas;
  if (data.color) attrs.color = data.color;
  if (data.duracion) attrs.duracion = data.duracion;
  if (data.origen) attrs.origen = data.origen;
  return attrs as Prisma.InputJsonValue;
}

// ============================================================
// Conversation (DB -> app)
// ============================================================

export function dbConversationToApp(
  conv: Conversation & { messages?: Message[] }
): Conversacion {
  const minutosAtras = Math.max(
    0,
    Math.round((Date.now() - conv.updatedAt.getTime()) / 60000)
  );

  let resumen = conv.summary ?? "";
  if (!resumen && conv.messages && conv.messages.length > 0) {
    resumen = conv.messages[conv.messages.length - 1].content.slice(0, 60);
  }
  if (!resumen) resumen = "Sin mensajes";

  // Método de pago (si el pedido estructurado lo tiene).
  const order = (conv.orderData ?? null) as { metodoPago?: string | null } | null;
  const metodoPago = order?.metodoPago ?? null;

  return {
    id: conv.id,
    cliente: conv.customerName,
    resumen,
    total: conv.totalAmount ? Number(conv.totalAmount) : 0,
    minutosAtras,
    canal: dbCanalToApp(conv.channel),
    estado: dbEstadoToApp(conv.status),
    metodoPago,
  };
}
