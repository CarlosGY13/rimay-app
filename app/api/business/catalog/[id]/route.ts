import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbCatalogItemToApp, appCatalogAttributes } from "@/lib/tenant";
import type { CatalogItem } from "@/lib/types";

// Actualiza un ítem del catálogo.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as Partial<CatalogItem>;

    const updated = await prisma.catalogItem.update({
      where: { id: params.id },
      data: {
        ...(body.nombre !== undefined ? { name: body.nombre } : {}),
        ...(body.precio !== undefined ? { price: body.precio } : {}),
        ...(body.descripcion !== undefined
          ? { description: body.descripcion ?? null }
          : {}),
        attributes: appCatalogAttributes(body),
      },
    });

    return NextResponse.json(dbCatalogItemToApp(updated));
  } catch (e) {
    console.error("PATCH /api/business/catalog/[id] failed:", e);
    return NextResponse.json(
      { error: "No se pudo actualizar el ítem." },
      { status: 500 }
    );
  }
}

// Elimina un ítem del catálogo.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.catalogItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/business/catalog/[id] failed:", e);
    return NextResponse.json(
      { error: "No se pudo eliminar el ítem." },
      { status: 500 }
    );
  }
}
