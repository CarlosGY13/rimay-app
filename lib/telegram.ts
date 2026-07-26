// Helpers para la Bot API de Telegram. El token se lee de TELEGRAM_BOT_TOKEN
// (nunca hardcodeado).

function apiUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no está configurado.");
  return `https://api.telegram.org/bot${token}/${method}`;
}

// Envía un mensaje de texto a un chat. No lanza: loguea y devuelve si falló,
// para no romper el manejo del webhook.
export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error(
        "sendTelegramMessage falló:",
        res.status,
        await res.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendTelegramMessage error:", e);
    return false;
  }
}

// Registra el webhook en Telegram (uso puntual, desde el script de setup).
export async function setTelegramWebhook(
  url: string,
  secret: string
): Promise<unknown> {
  const res = await fetch(apiUrl("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret }),
  });
  return res.json();
}

// Tipos mínimos del update de Telegram que nos interesan.
export type TelegramUpdate = {
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; last_name?: string };
    chat: { id: number; type: string };
    text?: string;
  };
};
