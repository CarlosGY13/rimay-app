import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { dbRubroToApp } from "@/lib/tenant";
import { getProvider } from "@/lib/ai/getProvider";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const TIMEOUT_MS = 25_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("extraction timeout")), ms)
    ),
  ]);
}

// Analiza una imagen de carta/menú con el proveedor de IA configurado y
// devuelve los ítems extraídos. NO persiste: el cliente decide cuáles agregar
// (deduplicando contra el catálogo actual).
export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const form = await request.formData();
    const file = form.get("file");

    // Nota: en Node 18 el global `File` no existe (llegó en Node 20), así que
    // validamos por duck-typing sobre Blob en vez de `instanceof File`.
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Adjuntá una imagen de la carta." },
        { status: 400 }
      );
    }

    const blob = file as Blob;
    if (!blob.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Por ahora solo se puede analizar una imagen (PNG o JPG)." },
        { status: 400 }
      );
    }
    if (blob.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande (máximo 8 MB)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const imageBase64 = buffer.toString("base64");

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
    });

    const provider = getProvider();
    const items = await withTimeout(
      provider.extractCatalogItems({
        imageBase64,
        mimeType: blob.type,
        rubro: dbRubroToApp(tenant.rubro),
      }),
      TIMEOUT_MS
    );

    return NextResponse.json({ items });
  } catch (e) {
    console.error("POST /api/business/catalog/extract failed:", e);
    return NextResponse.json(
      { error: "No se pudo analizar la carta. Intentá con otra imagen." },
      { status: 502 }
    );
  }
}
