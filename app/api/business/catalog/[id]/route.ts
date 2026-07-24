import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbCatalogItemToApp, appCatalogAttributes } from "@/lib/tenant";
import { requireSession } from "@/lib/auth/session";
import type { CatalogItem } from "@/lib/types";

// Verifica que el ítem exista y pertenezca al tenant de la sesión.
async function ownsItem(id: string, tenantId: string): Promise<boolean> {
  const item = await prisma.catalogItem.findUnique({
    where: { id },
    select: { tenantId: true },
  });
  return !!item && item.tenantId === tenantId;
}

// Actualiza un ítem del catálogo.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    if (!(await ownsItem(params.id, session.tenantId))) {
      return NextResponse.json({ error: "Ítem no encontrado." }, { status: 404 });
    }

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
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    if (!(await ownsItem(params.id, session.tenantId))) {
      return NextResponse.json({ error: "Ítem no encontrado." }, { status: 404 });
    }
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
