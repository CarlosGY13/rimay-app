// ============================================================
// Rimay - modelo de datos del MVP visual
// ============================================================

export type Rubro =
  | "restaurante"
  | "ropa"
  | "veterinaria"
  | "belleza"
  | "generico";

export type Tono = "cercano" | "formal" | "juvenil";

// Categorías usadas por el rubro restaurante
export type CategoriaPlato = "entrada" | "fondo" | "bebida";

// Ítem unificado del catálogo. Los campos opcionales aplican
// según el rubro elegido en el onboarding.

// Cómo se cargó el ítem: extraído por la IA desde una carta, o a mano.
export type ItemOrigen = "ai" | "manual";

export type CatalogItem = {
  id: string;
  nombre: string;
  precio: number;
  // restaurante
  categoria?: CategoriaPlato;
  // tienda de ropa
  tallas?: string[];
  color?: string;
  // veterinaria / belleza
  duracion?: string;
  // genérico
  descripcion?: string;
  // origen de la carga (IA vs manual)
  origen?: ItemOrigen;
};

export type Canales = {
  whatsapp: boolean;
  instagram: boolean;
  facebook: boolean;
  web: boolean;
};

// ============================================================
// Entregas y pagos (delivery por distrito)
// ============================================================

// Cómo resuelve el agente el envío:
// - automatico: aplica la tabla de zonas sin intervención humana.
// - confirmacion: la ubicación la valida una persona antes de cerrar.
export type DeliveryMode = "automatico" | "confirmacion";

// Tarifa fija de envío para un distrito.
export type DeliveryZone = {
  id: string;
  distrito: string;
  fee: number;
};

export type BusinessConfig = {
  rubro: Rubro | null;
  nombre: string;
  tono: Tono;
  canales: Canales;
  catalogo: CatalogItem[];
  reglas: string[];
  cartaFileName: string | null;
  // Entregas y pagos
  deliveryMode: DeliveryMode;
  paymentMethods: string[];
  zonas: DeliveryZone[];
};

// ============================================================
// Inbox (panel operativo mock)
// ============================================================

export type CanalOrigen = "whatsapp" | "instagram" | "web" | "telegram";

export type EstadoConversacion =
  | "nuevo"
  | "preparacion"
  | "revision"
  | "completado";

export type Conversacion = {
  id: string;
  cliente: string;
  resumen: string;
  total: number;
  minutosAtras: number;
  canal: CanalOrigen;
  estado: EstadoConversacion;
};

// ============================================================
// Chat del Sandbox
// ============================================================

export type ChatRole = "user" | "agent";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  texto: string;
};

// ============================================================
// Resumen de orden (generado por el Sandbox)
// ============================================================

export type OrderSummary = {
  items: { nombre: string; precio: number }[];
  total: number;
  canal: CanalOrigen;
  needs_human_review: boolean;
};
