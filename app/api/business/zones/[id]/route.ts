import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

// Verifica que la zona exista y pertenezca al tenant de la sesión.
async function ownsZone(id: string, tenantId: string): Promise<boolean> {
  const zone = await prisma.deliveryZone.findUnique({
    where: { id },
    select: { tenantId: true },
  });
  return !!zone && zone.tenantId === tenantId;
}

// Elimina una zona de delivery.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    if (!(await ownsZone(params.id, session.tenantId))) {
      return NextResponse.json(
        { error: "Zona no encontrada." },
        { status: 404 }
      );
    }
    await prisma.deliveryZone.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/business/zones/[id] failed:", e);
    return NextResponse.json(
      { error: "No se pudo eliminar la zona." },
      { status: 500 }
    );
  }
}
