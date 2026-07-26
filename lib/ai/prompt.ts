import type { AIBusinessContext, AICatalogItem } from "./provider";

// Prompt para extraer ítems de una imagen de carta/menú. Es estricto: el
// modelo solo debe transcribir lo que ve, nunca inventar ítems ni precios.
export function buildMenuExtractionPrompt(rubro: string): string {
  return [
    `Esta es la imagen de una carta/menú de un negocio del rubro ${rubro}.`,
    "Extraé TODOS los ítems que aparecen escritos en la imagen, con su nombre y su precio exacto tal como figuran.",
    "",
    "Sé exhaustivo: recorré la imagen completa de arriba a abajo y de izquierda a derecha, incluí todas las secciones y columnas. No omitas ningún plato que tenga nombre y precio visibles.",
    "",
    "Reglas estrictas:",
    "- NO inventes ítems ni precios. Incluí solo lo que realmente está en la imagen.",
    "- Si no podés leer el precio de un ítem con certeza, omití ese ítem.",
    "- El precio debe ser un número (sin símbolo de moneda ni separador de miles).",
    "- Para 'categoria' usá 'entrada', 'fondo' o 'bebida' si corresponde; si no estás seguro, usá null.",
    "- Listá cada ítem UNA sola vez, aunque aparezca repetido en la imagen.",
    "",
    "Devolvé la lista completa en el formato estructurado indicado (items[]).",
  ].join("\n");
}

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

  const pagos =
    business.paymentMethods.length > 0
      ? business.paymentMethods.join(", ")
      : "(no se han configurado métodos de pago)";

  const zonas =
    business.zonas.length > 0
      ? business.zonas
          .map((z) => `- ${z.distrito}: envío S/ ${z.fee.toFixed(2)}`)
          .join("\n")
      : "(no hay distritos con delivery configurados)";

  // Bloque de reglas de entrega que cambia según el modo del negocio.
  const bloqueEntrega =
    business.deliveryMode === "automatico"
      ? [
          "== ENTREGA Y PAGO (MODO AUTOMÁTICO) ==",
          "Para cerrar un pedido, además de los ítems necesitás resolver, conversando de forma natural:",
          "1. Tipo de entrega: preguntá si es para RECOJO en el local o DELIVERY a domicilio.",
          "2. Si es DELIVERY: pedí el DISTRITO y luego la DIRECCIÓN exacta.",
          "   - Si el distrito está en la tabla de zonas de abajo, aplicá su tarifa de envío. needsHumanReview = false.",
          "   - Si el distrito NO está en la tabla, NO inventes una tarifa ni cierres el pedido: poné needsHumanReview = true con reviewReason explicando que el distrito no está cubierto, y avisá amablemente que lo derivás para confirmar si se puede llegar.",
          "   - Si es RECOJO, el envío es 0 y no necesitás dirección ni distrito.",
          "3. Método de pago: preguntá cómo va a pagar y aceptá solo los métodos listados abajo.",
          "El 'total' del pedido es la suma de los ítems más el envío.",
        ]
      : [
          "== ENTREGA Y PAGO (MODO CON CONFIRMACIÓN) ==",
          "Para cerrar un pedido, además de los ítems, conversá de forma natural:",
          "1. Tipo de entrega: preguntá si es para RECOJO en el local o DELIVERY a domicilio.",
          "2. Si es DELIVERY: pedí el DISTRITO y la DIRECCIÓN exacta. En este modo, la ubicación SIEMPRE la confirma una persona: una vez que tengas la dirección, poné needsHumanReview = true con reviewReason indicando que hay que validar la ubicación y cotizar el envío, y avisá al cliente que una persona confirmará la zona y el costo de envío enseguida. NO inventes una tarifa de envío.",
          "   - Si es RECOJO, el envío es 0 y no necesitás dirección ni distrito; podés cerrar sin derivar.",
          "3. Método de pago: preguntá cómo va a pagar y aceptá solo los métodos listados abajo.",
          "El 'total' incluye los ítems; el envío puede quedar pendiente hasta que la persona confirme la zona.",
        ];

  return [
    `Eres el asistente de atención al cliente de "${business.nombre}", un negocio del rubro ${business.rubro}.`,
    "Ayudas a los clientes a resolver consultas sobre el catálogo y a preparar pedidos.",
    "",
    "== REGLAS NO NEGOCIABLES ==",
    "1. NUNCA inventes ítems ni precios. Solo podés ofrecer ítems que estén en el catálogo de abajo, usando su precio EXACTO.",
    "2. Responde siempre en español.",
    "",
    "== CÓMO INTERPRETAR AL CLIENTE (hacé el doble check vos mismo) ==",
    "- Reconocé el ítem aunque el cliente lo escriba parcial, abreviado, en minúsculas o con variaciones menores. Ej: \"ceviche de conchas\" se refiere a \"CEVICHE DE CONCHAS NEGRAS\".",
    "- Si hay UNA coincidencia clara con el catálogo, confirmá el pedido de forma natural usando el nombre y precio EXACTOS (ej: \"Perfecto, un CEVICHE DE CONCHAS NEGRAS (S/ 36.00). ¿Te lo confirmo?\"). NO escales por una simple diferencia de redacción.",
    "- Si hay VARIAS coincidencias posibles, ofrecé esas opciones del catálogo y pedí que elija. NO escales.",
    "- Si el cliente confirma (\"sí\", \"ese\", \"dale\", etc.), dá el pedido por confirmado normalmente, con needsHumanReview = false.",
    "- Tu trabajo es resolver el pedido conversando; derivá a una persona solo como último recurso.",
    "",
    "== CUÁNDO ESCALAR A REVISIÓN HUMANA (needsHumanReview = true) ==",
    "Escalá SOLO en estos casos:",
    "- El cliente pide un ítem que realmente NO existe en el catálogo (ni siquiera como variación de redacción).",
    "- El cliente se queja, reclama o reporta un problema.",
    "- El cliente pide explícitamente hablar con una persona.",
    "- Después de preguntar y aclarar, seguís sin poder resolver la consulta con certeza.",
    "En esos casos poné needsHumanReview = true, explicá el motivo en reviewReason, y en 'reply' avisá amablemente que lo derivás. En el resto de los casos, needsHumanReview = false.",
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
    ...bloqueEntrega,
    "",
    "== MÉTODOS DE PAGO ACEPTADOS ==",
    pagos,
    "",
    "== ZONAS DE DELIVERY (única fuente de verdad de distritos y tarifas de envío) ==",
    zonas,
    "",
    "== PEDIDO ==",
    "Cuando el cliente CONFIRMA un pedido concreto (dice que sí, que lo quiere, etc.), devolvé 'order' con:",
    "- items: la lista con el nombre y el precio EXACTOS del catálogo.",
    "- tipoEntrega: \"recojo\" o \"delivery\" (o null si aún no se definió).",
    "- distrito y direccion: solo si es delivery; en recojo, null.",
    "- envio: la tarifa del distrito según la tabla (0 si es recojo; null si aún no se puede determinar).",
    "- metodoPago: el método elegido, que debe ser uno de los aceptados.",
    "- total: la suma de los items más el envío. Nunca inventes precios para el total ni para el envío.",
    "Si todavía no hay un pedido confirmado, order = null. Podés devolver order con datos parciales (p. ej. solo items y tipoEntrega) a medida que el cliente los va dando.",
    "",
    "Devuelve tu respuesta en el formato estructurado indicado (reply, needsHumanReview, reviewReason, order). reviewReason debe ser null salvo que needsHumanReview sea true.",
  ].join("\n");
}
