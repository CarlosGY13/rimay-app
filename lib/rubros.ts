import type {
  Rubro,
  CatalogItem,
  Canales,
  BusinessConfig,
} from "./types";

// Campos del catálogo que muestra el Portal según el rubro.
export type CampoCatalogo =
  | "categoria"
  | "tallas"
  | "color"
  | "duracion"
  | "descripcion";

export type RubroDef = {
  id: Rubro;
  nombre: string;
  icono: string;
  descripcion: string;
  // Etiqueta de la sección de catálogo en el Portal
  catalogoLabel: string;
  // Etiqueta en singular para el botón "Agregar ..."
  itemSingular: string;
  // Campos extra a mostrar en el formulario del ítem
  campos: CampoCatalogo[];
};

export const RUBROS: RubroDef[] = [
  {
    id: "restaurante",
    nombre: "Restaurante / comida",
    icono: "🍽️",
    descripcion: "Menú, extras y delivery",
    catalogoLabel: "Platos del menú",
    itemSingular: "plato",
    campos: ["categoria"],
  },
  {
    id: "ropa",
    nombre: "Tienda de ropa",
    icono: "👕",
    descripcion: "Tallas, colores y stock",
    catalogoLabel: "Productos",
    itemSingular: "producto",
    campos: ["tallas", "color"],
  },
  {
    id: "veterinaria",
    nombre: "Veterinaria / servicios con cita",
    icono: "🐾",
    descripcion: "Servicios y horarios disponibles",
    catalogoLabel: "Servicios",
    itemSingular: "servicio",
    campos: ["duracion"],
  },
  {
    id: "belleza",
    nombre: "Belleza y estética",
    icono: "💅",
    descripcion: "Servicios, duración y precio",
    catalogoLabel: "Servicios",
    itemSingular: "servicio",
    campos: ["duracion"],
  },
  {
    id: "generico",
    nombre: "Otro / genérico",
    icono: "📦",
    descripcion: "Catálogo simple de productos o servicios",
    catalogoLabel: "Productos o servicios",
    itemSingular: "ítem",
    campos: ["descripcion"],
  },
];

export function getRubroDef(rubro: Rubro): RubroDef {
  return RUBROS.find((r) => r.id === rubro) ?? RUBROS[RUBROS.length - 1];
}

// ------------------------------------------------------------
// Datos de ejemplo precargados por rubro
// ------------------------------------------------------------

const CATALOGOS_EJEMPLO: Record<Rubro, CatalogItem[]> = {
  restaurante: [
    { id: "r1", nombre: "Combo familiar", precio: 65, categoria: "fondo" },
    { id: "r2", nombre: "1/4 de pollo con papas", precio: 18, categoria: "fondo" },
    { id: "r3", nombre: "Ensalada fresca", precio: 12, categoria: "entrada" },
    { id: "r4", nombre: "Inca Kola 1L", precio: 8, categoria: "bebida" },
  ],
  ropa: [
    {
      id: "c1",
      nombre: "Polo básico algodón",
      precio: 39.9,
      tallas: ["S", "M", "L", "XL"],
      color: "Negro",
    },
    {
      id: "c2",
      nombre: "Jean slim fit",
      precio: 89.9,
      tallas: ["28", "30", "32", "34"],
      color: "Azul",
    },
    {
      id: "c3",
      nombre: "Casaca ligera",
      precio: 129.9,
      tallas: ["M", "L", "XL"],
      color: "Beige",
    },
  ],
  veterinaria: [
    { id: "v1", nombre: "Consulta general", precio: 50, duracion: "30 min" },
    { id: "v2", nombre: "Vacuna antirrábica", precio: 40, duracion: "15 min" },
    { id: "v3", nombre: "Baño y corte", precio: 60, duracion: "60 min" },
    { id: "v4", nombre: "Desparasitación", precio: 35, duracion: "20 min" },
  ],
  belleza: [
    { id: "b1", nombre: "Corte de cabello", precio: 35, duracion: "45 min" },
    { id: "b2", nombre: "Manicure clásico", precio: 30, duracion: "40 min" },
    { id: "b3", nombre: "Tinte completo", precio: 120, duracion: "120 min" },
    { id: "b4", nombre: "Peinado express", precio: 45, duracion: "30 min" },
  ],
  generico: [
    {
      id: "g1",
      nombre: "Producto estrella",
      precio: 25,
      descripcion: "El más pedido por nuestros clientes",
    },
    {
      id: "g2",
      nombre: "Servicio premium",
      precio: 80,
      descripcion: "Atención personalizada de principio a fin",
    },
    {
      id: "g3",
      nombre: "Pack básico",
      precio: 15,
      descripcion: "Ideal para empezar",
    },
  ],
};

const REGLAS_EJEMPLO: Record<Rubro, string[]> = {
  restaurante: [
    "Los envíos a más de 5km cuestan S/10 adicionales",
    "El pedido mínimo para delivery es S/25",
  ],
  ropa: [
    "No hacemos cambios de talla después de 7 días",
    "Los envíos son gratis en compras mayores a S/150",
  ],
  veterinaria: [
    "Las citas se agendan con al menos 2 horas de anticipación",
    "Atención de emergencias solo de forma presencial",
  ],
  belleza: [
    "Reservas confirmadas requieren adelanto del 50%",
    "Cancelaciones con menos de 3 horas pierden el adelanto",
  ],
  generico: [
    "Los precios pueden variar según disponibilidad",
    "Atención de lunes a sábado de 9am a 7pm",
  ],
};

export const CANALES_DEFAULT: Canales = {
  whatsapp: true,
  instagram: false,
  facebook: false,
  web: true,
};

// Genera la configuración inicial al elegir un rubro en onboarding.
export function crearConfigInicial(rubro: Rubro): BusinessConfig {
  return {
    rubro,
    nombre: "",
    tono: "cercano",
    canales: { ...CANALES_DEFAULT },
    catalogo: CATALOGOS_EJEMPLO[rubro].map((it) => ({ ...it })),
    reglas: [...REGLAS_EJEMPLO[rubro]],
    cartaFileName: null,
    deliveryMode: "automatico",
    paymentMethods: [],
    zonas: [],
  };
}
