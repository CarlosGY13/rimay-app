import { prisma } from "@/lib/db";
import {
  dbRubroToApp,
  dbTonoToApp,
  dbCatalogItemToApp,
} from "@/lib/tenant";
import type { AIBusinessContext } from "./provider";

// Carga el contexto de negocio (catálogo, reglas, zonas, pagos, modo de
// entrega) que necesita el motor de IA, para un tenant dado. Fuente única para
// el webhook de Telegram, el sandbox y la confirmación de envío del operador.
export async function loadBusinessContext(
  tenantId: string
): Promise<AIBusinessContext> {
  const [tenant, catalogo, reglas, zonas] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.catalogItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.businessRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.deliveryZone.findMany({
      where: { tenantId },
      orderBy: { distrito: "asc" },
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
    deliveryMode: tenant.deliveryMode,
    paymentMethods: tenant.paymentMethods,
    zonas: zonas.map((z) => ({ distrito: z.distrito, fee: Number(z.fee) })),
  };
}
