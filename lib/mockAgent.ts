import type { BusinessConfig, CatalogItem, Tono } from "./types";

// Normaliza texto para comparar sin tildes ni mayúsculas.
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Saludos según el tono configurado del agente.
function saludo(tono: Tono): string {
  switch (tono) {
    case "formal":
      return "Buen día. Con gusto le ayudo.";
    case "juvenil":
      return "¡Holaa! 🙌 A ver, te cuento:";
    case "cercano":
    default:
      return "¡Hola! Claro que sí, te ayudo con eso.";
  }
}

// Busca ítems del catálogo mencionados en el mensaje.
function buscarItems(mensaje: string, catalogo: CatalogItem[]): CatalogItem[] {
  const msg = normalizar(mensaje);
  return catalogo.filter((item) => {
    const nombre = normalizar(item.nombre);
    // coincidencia por nombre completo o por alguna palabra significativa (>3 letras)
    if (msg.includes(nombre)) return true;
    return nombre
      .split(/\s+/)
      .filter((p) => p.length > 3)
      .some((palabra) => msg.includes(palabra));
  });
}

function detalleItem(item: CatalogItem): string {
  const partes: string[] = [];
  if (item.duracion) partes.push(`duración ${item.duracion}`);
  if (item.color) partes.push(`color ${item.color}`);
  if (item.tallas && item.tallas.length > 0)
    partes.push(`tallas ${item.tallas.join(", ")}`);
  const extra = partes.length > 0 ? ` (${partes.join(", ")})` : "";
  return `• ${item.nombre} — S/ ${item.precio.toFixed(2)}${extra}`;
}

/**
 * MOCK: reemplazar con llamada real al AI core más adelante.
 *
 * Genera una respuesta del agente simulada. No hay ningún LLM detrás:
 * solo hace coincidencia simple de palabras clave contra el catálogo
 * configurado en el Context. Si encuentra ítems, arma una respuesta con
 * sus precios; si no, pide más detalle.
 */
export function generarRespuestaMock(
  mensaje: string,
  config: BusinessConfig
): string {
  const encontrados = buscarItems(mensaje, config.catalogo);

  if (encontrados.length > 0) {
    const lineas = encontrados.map(detalleItem).join("\n");
    const total = encontrados.reduce((sum, it) => sum + it.precio, 0);
    return (
      `${saludo(config.tono)}\n\n` +
      `Esto es lo que tenemos disponible:\n${lineas}\n\n` +
      `Total referencial: S/ ${total.toFixed(2)}. ` +
      `¿Deseas confirmar el pedido?`
    );
  }

  // Sin coincidencias en el catálogo
  return (
    `${saludo(config.tono)}\n\n` +
    `Mmm, no reconozco eso dentro de nuestro catálogo. ` +
    `¿Podrías darme un poco más de detalle o decirme el nombre exacto de lo que buscas?`
  );
}
