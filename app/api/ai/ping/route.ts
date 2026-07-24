import { NextResponse } from "next/server";
import { getProvider } from "@/lib/ai/getProvider";

// ⚠️ RUTA TEMPORAL — solo para verificar el cableado con el proveedor de IA
// (OpenAI/Gemini) de punta a punta, sin arriesgar el flujo de /sandbox (que
// sigue usando mockAgent.ts hasta la Tarea 5). Se puede BORRAR cuando la
// Tarea 5 conecte el proveedor real al sandbox.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const provider = getProvider();
    const respuesta = await provider.generateResponse({
      message: "Hola, ¿estás funcionando?",
      history: [],
      business: {
        nombre: "Rimay",
        rubro: "generico",
        tono: "cercano",
        catalogo: [],
        reglas: [],
      },
    });

    return NextResponse.json({
      provider: process.env.AI_PROVIDER,
      ...respuesta,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
