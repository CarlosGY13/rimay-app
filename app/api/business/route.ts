import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  appRubroToDb,
  dbRubroToApp,
  appTonoToDb,
  dbTonoToApp,
  dbCatalogItemToApp,
  appCatalogAttributes,
} from "@/lib/tenant";
import { requireSession } from "@/lib/auth/session";
import { crearConfigInicial } from "@/lib/rubros";
import type { Rubro, Tono } from "@/lib/types";

export const dynamic = "force-dynamic";

// Devuelve el negocio del tenant de la sesión con su catálogo y reglas, en la
// forma que consume el BusinessContext (rubro/tono en valores de la app).
async function loadBusiness(tenantId: string) {
  const [tenant, catalogo, reglas] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.catalogItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.businessRule.findMany({
      where: { tenantId },
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
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    return NextResponse.json(await loadBusiness(session.tenantId));
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
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    const body = (await request.json()) as {
      nombre?: string;
      rubro?: Rubro;
      tono?: Tono;
    };

    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        ...(body.nombre !== undefined ? { name: body.nombre } : {}),
        ...(body.rubro !== undefined ? { rubro: appRubroToDb(body.rubro) } : {}),
        ...(body.tono !== undefined ? { tono: appTonoToDb(body.tono) } : {}),
      },
    });

    return NextResponse.json(await loadBusiness(session.tenantId));
  } catch (e) {
    console.error("PATCH /api/business failed:", e);
    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 }
    );
  }
}

// Onboarding: fija el rubro y reemplaza catálogo + reglas con el set de
// ejemplo de ese rubro, todo en una transacción.
export async function PUT(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    const body = (await request.json()) as { rubro?: Rubro };
    if (!body.rubro) {
      return NextResponse.json(
        { error: "El campo 'rubro' es obligatorio." },
        { status: 400 }
      );
    }

    const tenantId = session.tenantId;
    const ejemplo = crearConfigInicial(body.rubro);

    await prisma.$transaction([
      prisma.catalogItem.deleteMany({ where: { tenantId } }),
      prisma.businessRule.deleteMany({ where: { tenantId } }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: {
          rubro: appRubroToDb(body.rubro),
          tono: appTonoToDb(ejemplo.tono),
        },
      }),
      prisma.catalogItem.createMany({
        data: ejemplo.catalogo.map((item) => ({
          tenantId,
          name: item.nombre,
          price: item.precio,
          description: item.descripcion ?? null,
          attributes: appCatalogAttributes(item),
        })),
      }),
      prisma.businessRule.createMany({
        data: ejemplo.reglas.map((text) => ({ tenantId, text })),
      }),
    ]);

    return NextResponse.json(await loadBusiness(tenantId));
  } catch (e) {
    console.error("PUT /api/business failed:", e);
    return NextResponse.json(
      { error: "No se pudo configurar el rubro." },
      { status: 500 }
    );
  }
}
