import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Actualiza el texto de una regla.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "El campo 'text' es obligatorio." },
        { status: 400 }
      );
    }

    const updated = await prisma.businessRule.update({
      where: { id: params.id },
      data: { text },
    });

    return NextResponse.json({ id: updated.id, text: updated.text });
  } catch (e) {
    console.error("PATCH /api/business/rules/[id] failed:", e);
    return NextResponse.json(
      { error: "No se pudo actualizar la regla." },
      { status: 500 }
    );
  }
}

// Elimina una regla.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.businessRule.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/business/rules/[id] failed:", e);
    return NextResponse.json(
      { error: "No se pudo eliminar la regla." },
      { status: 500 }
    );
  }
}
