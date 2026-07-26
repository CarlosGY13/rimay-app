import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

// Crea una zona de delivery (distrito + tarifa) para el tenant de la sesión.
export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    const body = (await request.json()) as {
      distrito?: string;
      fee?: number;
    };

    const distrito =
      typeof body.distrito === "string" ? body.distrito.trim() : "";
    const fee = typeof body.fee === "number" ? body.fee : NaN;

    if (distrito.length === 0 || !Number.isFinite(fee) || fee < 0) {
      return NextResponse.json(
        { error: "Distrito y tarifa (>= 0) son obligatorios." },
        { status: 400 }
      );
    }

    const created = await prisma.deliveryZone.create({
      data: { tenantId: session.tenantId, distrito, fee },
    });

    return NextResponse.json(
      { id: created.id, distrito: created.distrito, fee: Number(created.fee) },
      { status: 201 }
    );
  } catch (e) {
    // Violación de unicidad (tenantId + distrito): ese distrito ya existe.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ese distrito ya tiene una tarifa configurada." },
        { status: 409 }
      );
    }
    console.error("POST /api/business/zones failed:", e);
    return NextResponse.json(
      { error: "No se pudo agregar la zona." },
      { status: 500 }
    );
  }
}
