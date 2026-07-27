// Forma mínima para armar el resumen: sirve tanto para el pedido de la IA
// (AIOrder) como para el pedido estructurado guardado (StoredOrder).
type OrderLike = {
  items: { nombre: string; precio: number }[];
  tipoEntrega?: "recojo" | "delivery" | null;
  distrito?: string | null;
  direccion?: string | null;
  envio?: number | null;
  metodoPago?: string | null;
};

// Arma un resumen legible del pedido para el operador (inbox): ítems, tipo de
// entrega, distrito/dirección, método de pago y desglose de envío.
export function buildOrderSummary(order: OrderLike): string {
  const partes: string[] = [];

  const items = order.items
    .map((i) => `${i.nombre} (S/ ${i.precio.toFixed(2)})`)
    .join(", ");
  partes.push(items);

  if (order.tipoEntrega === "recojo") {
    partes.push("Entrega: recojo en local");
  } else if (order.tipoEntrega === "delivery") {
    const destino = [order.distrito, order.direccion]
      .filter((x): x is string => !!x)
      .join(" - ");
    partes.push(`Entrega: delivery${destino ? ` a ${destino}` : ""}`);
    if (order.envio != null) {
      partes.push(`Envío: S/ ${order.envio.toFixed(2)}`);
    }
  }

  if (order.metodoPago) partes.push(`Pago: ${order.metodoPago}`);

  return partes.join(" · ");
}
