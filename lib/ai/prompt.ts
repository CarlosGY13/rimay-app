import type { AIRequest } from "./provider";

// Arma un prompt básico a partir del AIRequest. Es intencionalmente simple:
// solo sirve para confirmar el cableado extremo a extremo con el proveedor.
// El prompt de producción (reglas estrictas, salida estructurada, grounding
// contra el catálogo, etc.) se diseña en la Tarea 5.
export function buildBasicPrompt(input: AIRequest): string {
  const { message, history, business } = input;

  const catalogo =
    business.catalogo.length > 0
      ? business.catalogo
          .map((i) => `- ${i.nombre}: S/ ${i.precio.toFixed(2)}`)
          .join("\n")
      : "(sin ítems cargados)";

  const reglas =
    business.reglas.length > 0
      ? business.reglas.map((r) => `- ${r}`).join("\n")
      : "(sin reglas)";

  const historial =
    history.length > 0
      ? history.map((m) => `${m.role}: ${m.content}`).join("\n")
      : "(sin historial)";

  return [
    `Eres el asistente de atención al cliente de "${business.nombre}".`,
    `Tono de las respuestas: ${business.tono}.`,
    "",
    "Catálogo:",
    catalogo,
    "",
    "Reglas del negocio:",
    reglas,
    "",
    "Historial reciente:",
    historial,
    "",
    `Mensaje del cliente: ${message}`,
  ].join("\n");
}
