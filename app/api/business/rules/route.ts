import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

// Crea una regla de negocio para el tenant de la sesión.
export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "El campo 'text' es obligatorio." },
        { status: 400 }
      );
    }

    const created = await prisma.businessRule.create({
      data: { tenantId: session.tenantId, text },
    });

    return NextResponse.json(
      { id: created.id, text: created.text },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/business/rules failed:", e);
    return NextResponse.json(
      { error: "No se pudo agregar la regla." },
      { status: 500 }
    );
  }
}
