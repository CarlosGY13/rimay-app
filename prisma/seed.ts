import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Datos semilla para desarrollo: un tenant de ejemplo (rubro restaurante)
// que replica el catálogo y las reglas mock que ya existen hoy en el código
// (lib/rubros.ts). Sirve para probar la Tarea 3 sin reconfigurar el onboarding
// a mano cada vez. Es idempotente: upsert por slug.

const TENANT_SLUG = "sabores-del-valle";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      name: "Sabores del Valle",
      slug: TENANT_SLUG,
      rubro: "restaurante",
      tono: "cercano",
    },
  });

  // Reset de datos derivados para que el seed sea repetible sin duplicar.
  await prisma.catalogItem.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.businessRule.deleteMany({ where: { tenantId: tenant.id } });

  await prisma.catalogItem.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Combo familiar",
        price: 65,
        attributes: { categoria: "fondo" },
      },
      {
        tenantId: tenant.id,
        name: "1/4 de pollo con papas",
        price: 18,
        attributes: { categoria: "fondo" },
      },
      {
        tenantId: tenant.id,
        name: "Ensalada fresca",
        price: 12,
        attributes: { categoria: "entrada" },
      },
      {
        tenantId: tenant.id,
        name: "Inca Kola 1L",
        price: 8,
        attributes: { categoria: "bebida" },
      },
    ],
  });

  await prisma.businessRule.createMany({
    data: [
      {
        tenantId: tenant.id,
        text: "Los envíos a más de 5km cuestan S/10 adicionales",
      },
      {
        tenantId: tenant.id,
        text: "El pedido mínimo para delivery es S/25",
      },
    ],
  });

  const items = await prisma.catalogItem.count({ where: { tenantId: tenant.id } });
  const rules = await prisma.businessRule.count({ where: { tenantId: tenant.id } });
  console.log(
    `Seed OK: tenant "${tenant.name}" (${tenant.slug}) con ${items} ítems y ${rules} reglas.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
