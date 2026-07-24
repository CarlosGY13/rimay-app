import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getFixedTenant,
  dbCatalogItemToApp,
  appCatalogAttributes,
} from "@/lib/tenant";
import type { CatalogItem } from "@/lib/types";

// Crea un ítem de catálogo para el tenant fijo.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Omit<CatalogItem, "id">;

    if (!body.nombre || typeof body.precio !== "number") {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (nombre, precio)." },
        { status: 400 }
      );
    }

    const tenant = await getFixedTenant();
    const created = await prisma.catalogItem.create({
      data: {
        tenantId: tenant.id,
        name: body.nombre,
        price: body.precio,
        description: body.descripcion ?? null,
        attributes: appCatalogAttributes(body),
      },
    });

    return NextResponse.json(dbCatalogItemToApp(created), { status: 201 });
  } catch (e) {
    console.error("POST /api/business/catalog failed:", e);
    return NextResponse.json(
      { error: "No se pudo agregar el ítem." },
      { status: 500 }
    );
  }
}
