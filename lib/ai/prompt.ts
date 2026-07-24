import type { AIBusinessContext, AICatalogItem } from "./provider";

const TONO_INSTRUCCION: Record<string, string> = {
  cercano: "Cercano y cálido, como alguien de confianza.",
  formal: "Formal y directo, tratando de usted.",
  juvenil: "Juvenil y divertido, con energía (podés usar emojis con moderación).",
};

function formatItem(item: AICatalogItem): string {
  const attrs: string[] = [];
  if (item.categoria) attrs.push(`categoría: ${item.categoria}`);
  if (item.duracion) attrs.push(`duración: ${item.duracion}`);
  if (item.color) attrs.push(`color: ${item.color}`);
  if (item.tallas && item.tallas.length > 0)
    attrs.push(`tallas: ${item.tallas.join(", ")}`);
  if (item.descripcion) attrs.push(item.descripcion);
  const extra = attrs.length > 0 ? ` (${attrs.join("; ")})` : "";
  return `- ${item.nombre} — S/ ${item.precio.toFixed(2)}${extra}`;
}

// Arma el prompt de sistema a partir de los datos del tenant. Fuerza, en texto
// explícito, las reglas no negociables del producto.
export function buildSystemPrompt(business: AIBusinessContext): string {
  const catalogo =
    business.catalogo.length > 0
      ? business.catalogo.map(formatItem).join("\n")
      : "(el catálogo está vacío)";

  const reglas =
    business.reglas.length > 0
      ? business.reglas.map((r) => `- ${r}`).join("\n")
      : "(sin reglas adicionales)";

  const tono =
    TONO_INSTRUCCION[business.tono] ?? TONO_INSTRUCCION.cercano;

  return [
    `Eres el asistente de atención al cliente de "${business.nombre}", un negocio del rubro ${business.rubro}.`,
    "Ayudas a los clientes a resolver consultas sobre el catálogo y a preparar pedidos.",
    "",
    "== REGLAS NO NEGOCIABLES ==",
    "1. NUNCA menciones, sugieras ni inventes un ítem que no esté EXACTAMENTE en el catálogo de abajo.",
    "2. NUNCA inventes ni modifiques un precio. Usa SIEMPRE el precio exacto que figura en el catálogo.",
    "3. Si el cliente pide algo que no está en el catálogo, algo ambiguo que no podés resolver con certeza, se queja/reclama, o pide hablar con una persona: NO adivines. Marca la respuesta para revisión humana (needsHumanReview = true) y explicá el motivo en reviewReason.",
    "4. Cuando marques para revisión, tu 'reply' al cliente debe ser amable y sin inventar nada (ej: avisar que lo deriva a una persona del equipo).",
    "5. Responde siempre en español.",
    "",
    `== TONO ==`,
    tono,
    "",
    "== CATÁLOGO (única fuente de verdad de ítems y precios) ==",
    catalogo,
    "",
    "== REGLAS DEL NEGOCIO ==",
    reglas,
    "",
    "Devuelve tu respuesta en el formato estructurado indicado (reply, needsHumanReview, reviewReason). reviewReason debe ser null salvo que needsHumanReview sea true.",
  ].join("\n");
}
