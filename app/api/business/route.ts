import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getFixedTenant,
  appRubroToDb,
  dbRubroToApp,
  appTonoToDb,
  dbTonoToApp,
  dbCatalogItemToApp,
  appCatalogAttributes,
} from "@/lib/tenant";
import { crearConfigInicial } from "@/lib/rubros";
import type { Rubro, Tono } from "@/lib/types";

export const dynamic = "force-dynamic";

// Devuelve el tenant fijo con su catálogo y reglas, en la forma que consume
// el BusinessContext (rubro/tono en valores de la app; reglas con id).
async function loadBusiness() {
  const tenant = await getFixedTenant();
  const [catalogo, reglas] = await Promise.all([
    prisma.catalogItem.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.businessRule.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    nombre: tenant.name,
    rubro: dbRubroToApp(tenant.rubro),
    tono: dbTonoToApp(tenant.tono),
    catalogo: catalogo.map(dbCatalogItemToApp),
    reglas: reglas.map((r) => ({ id: r.id, text: r.text })),
  };
}

export async function GET() {
  try {
    const business = await loadBusiness();
    return NextResponse.json(business);
  } catch (e) {
    console.error("GET /api/business failed:", e);
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor." },
      { status: 500 }
    );
  }
}

// Actualiza datos básicos del negocio: nombre, rubro, tono.
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      nombre?: string;
      rubro?: Rubro;
      tono?: Tono;
    };

    const tenant = await getFixedTenant();
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(body.nombre !== undefined ? { name: body.nombre } : {}),
        ...(body.rubro !== undefined ? { rubro: appRubroToDb(body.rubro) } : {}),
        ...(body.tono !== undefined ? { tono: appTonoToDb(body.tono) } : {}),
      },
    });

    return NextResponse.json(await loadBusiness());
  } catch (e) {
    console.error("PATCH /api/business failed:", e);
    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 }
    );
  }
}

// Onboarding: fija el rubro y reemplaza catálogo + reglas con el set de
// ejemplo de ese rubro (equivalente a lo que hacía crearConfigInicial en
// memoria), todo en una transacción.
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { rubro?: Rubro };
    if (!body.rubro) {
      return NextResponse.json(
        { error: "El campo 'rubro' es obligatorio." },
        { status: 400 }
      );
    }

    const tenant = await getFixedTenant();
    const ejemplo = crearConfigInicial(body.rubro);

    await prisma.$transaction([
      prisma.catalogItem.deleteMany({ where: { tenantId: tenant.id } }),
      prisma.businessRule.deleteMany({ where: { tenantId: tenant.id } }),
      prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          rubro: appRubroToDb(body.rubro),
          tono: appTonoToDb(ejemplo.tono),
        },
      }),
      prisma.catalogItem.createMany({
        data: ejemplo.catalogo.map((item) => ({
          tenantId: tenant.id,
          name: item.nombre,
          price: item.precio,
          description: item.descripcion ?? null,
          attributes: appCatalogAttributes(item),
        })),
      }),
      prisma.businessRule.createMany({
        data: ejemplo.reglas.map((text) => ({ tenantId: tenant.id, text })),
      }),
    ]);

    return NextResponse.json(await loadBusiness());
  } catch (e) {
    console.error("PUT /api/business failed:", e);
    return NextResponse.json(
      { error: "No se pudo configurar el rubro." },
      { status: 500 }
    );
  }
}
