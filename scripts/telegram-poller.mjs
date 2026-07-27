// ============================================================
// Poller de Telegram para DESARROLLO LOCAL
//
// En vez de que Telegram nos empuje los mensajes por webhook (lo que exige una
// URL pública HTTPS y un túnel que se cae/rota), acá la app CONSULTA a Telegram
// con getUpdates (long polling). Cada mensaje recibido se reenvía a nuestro
// propio endpoint /api/telegram/webhook con el mismo secret, así se procesa con
// EXACTAMENTE la misma lógica que en producción (una sola fuente de verdad).
//
// Ventaja: no hace falta túnel, ni URL pública, ni registrar webhook. Arranca
// solo con `docker compose -f docker-compose.dev.yml up`.
//
// Solo para desarrollo. En producción se usa el webhook real (ver README).
// Node 18+ (usa fetch global). Sin dependencias externas.
// ============================================================

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBHOOK_URL =
  process.env.APP_WEBHOOK_URL ?? "http://app:3000/api/telegram/webhook";

const API = (method) => `https://api.telegram.org/bot${TOKEN}/${method}`;

function log(...args) {
  console.log("[telegram-poller]", ...args);
}

// Mantiene el proceso vivo sin hacer nada (para no entrar en loop de reinicio
// cuando el bot no está configurado).
function idleForever(reason) {
  log(reason);
  return new Promise(() => {});
}

async function tg(method, body) {
  const res = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(`${method} falló: ${JSON.stringify(data)}`);
  }
  return data.result;
}

// Reenvía el update crudo a nuestro webhook, tal como lo mandaría Telegram.
// Devuelve true solo si la app lo recibió (2xx); false si no se pudo entregar,
// para que el poller NO avance el offset y reintente el mismo mensaje después.
async function forwardToWebhook(update) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": SECRET,
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      log(`webhook respondió ${res.status} (¿la app ya levantó?)`);
      return false;
    }
    return true;
  } catch (e) {
    log("no se pudo contactar la app todavía:", e.message);
    return false;
  }
}

async function main() {
  if (!TOKEN || !SECRET) {
    return idleForever(
      "TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET no configurados; poller inactivo."
    );
  }

  // getUpdates y webhook son excluyentes: si hay un webhook viejo puesto,
  // Telegram rechaza getUpdates con 409. Lo quitamos.
  try {
    await tg("deleteWebhook", { drop_pending_updates: false });
  } catch (e) {
    log("aviso: deleteWebhook falló:", e.message);
  }

  // Arrancamos desde el final: descartamos el backlog viejo para no reprocesar
  // mensajes de sesiones anteriores.
  let offset = 0;
  try {
    const last = await tg("getUpdates", { offset: -1, timeout: 0 });
    if (Array.isArray(last) && last.length > 0) {
      offset = last[last.length - 1].update_id + 1;
    }
  } catch (e) {
    log("aviso: no se pudo primar el offset:", e.message);
  }

  log(`escuchando mensajes (offset inicial ${offset})...`);

  // Loop principal de long polling.
  for (;;) {
    try {
      const updates = await tg("getUpdates", {
        offset,
        timeout: 50,
        allowed_updates: ["message"],
      });
      for (const update of updates) {
        const delivered = await forwardToWebhook(update);
        if (!delivered) {
          // La app no recibió el mensaje (p. ej. está reiniciando). NO avanzamos
          // el offset: esperamos y reintentamos el mismo update, sin perderlo.
          await new Promise((r) => setTimeout(r, 2000));
          break;
        }
        offset = update.update_id + 1;
      }
    } catch (e) {
      // Errores de red o de la API: esperamos y reintentamos, sin morir.
      log("error en getUpdates, reintento en 3s:", e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((e) => {
  log("fatal:", e);
  process.exit(1);
});
