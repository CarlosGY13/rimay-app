import { NextResponse } from "next/server";
import { Channel } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getFixedTenant,
  dbRubroToApp,
  dbTonoToApp,
  dbCatalogItemToApp,
} from "@/lib/tenant";
import {
  getOrCreateExternalConversation,
  getSession,
  addMessage,
  markNeedsReview,
  updateOrderInfo,
} from "@/lib/conversationStore";
import { generarRespuestaIA } from "@/lib/ai/engine";
import type { AIBusinessContext, AIMessage } from "@/lib/ai/provider";
import { sendTelegramMessage, type TelegramUpdate } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const MAX_HISTORY = 10;

// Carga el contexto de negocio (tenant fijo) para el motor de IA.
async function loadBusinessContext(): Promise<AIBusinessContext> {
  const tenant = await getFixedTenant();
  const [catalogo, reglas] = await Promise.all([
    prisma.catalogItem.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.businessRule.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    nombre: tenant.name.trim().length > 0 ? tenant.name : "el negocio",
    rubro: dbRubroToApp(tenant.rubro),
    tono: dbTonoToApp(tenant.tono),
    catalogo: catalogo.map((c) => {
      const item = dbCatalogItemToApp(c);
      return {
        nombre: item.nombre,
        precio: item.precio,
        descripcion: item.descripcion,
        categoria: item.categoria,
        tallas: item.tallas,
        color: item.color,
        duracion: item.duracion,
      };
    }),
    reglas: reglas.map((r) => r.text),
  };
}

// Webhook de Telegram. Telegram hace POST acá con cada update. Validamos el
// secret que configuramos en setWebhook (header x-telegram-bot-api-secret-token).
export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token"
  );
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  const text = msg?.text?.trim();
  // Ignoramos updates sin mensaje de texto (stickers, ediciones, etc.).
  if (!msg || !text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const nombre =
    [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
    "Cliente Telegram";

  try {
    const conv = await getOrCreateExternalConversation({
      channel: Channel.telegram,
      externalId: String(chatId),
      customerName: nombre,
    });

    // Historial previo (antes de este mensaje) para dar contexto al modelo.
    const previa = await getSession(conv.id);
    const history: AIMessage[] = (previa?.mensajes ?? [])
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.texto }));

    await addMessage(conv.id, "user", text);

    // Si un operador tomó el chat, guardamos el mensaje pero NO respondemos
    // automáticamente (la persona está a cargo).
    if (conv.paused) {
      return NextResponse.json({ ok: true });
    }

    const business = await loadBusinessContext();
    const res = await generarRespuestaIA({ message: text, history, business });

    await addMessage(conv.id, "agent", res.text);

    // Si el cliente confirmó un pedido, guardamos items + total (se ve en el inbox).
    if (res.order) {
      const resumenPedido = res.order.items
        .map((i) => `${i.nombre} (S/ ${i.precio.toFixed(2)})`)
        .join(", ");
      await updateOrderInfo(conv.id, resumenPedido, res.order.total);
    }
    if (res.needsHumanReview) {
      await markNeedsReview(conv.id, res.reviewReason ?? undefined);
    }

    await sendTelegramMessage(chatId, res.text);
  } catch (e) {
    console.error("POST /api/telegram/webhook error:", e);
    await sendTelegramMessage(
      chatId,
      "Disculpá, tuvimos un problema procesando tu mensaje. Un compañero te ayudará enseguida."
    );
  }

  // Siempre 200 para que Telegram no reintente en loop.
  return NextResponse.json({ ok: true });
}
