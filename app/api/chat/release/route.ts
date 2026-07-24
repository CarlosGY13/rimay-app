import { NextResponse } from "next/server";
import { getSession, releaseSession } from "@/lib/conversationStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId es obligatorio." },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada." },
        { status: 404 }
      );
    }

    await releaseSession(sessionId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error liberando la sesión." },
      { status: 500 }
    );
  }
}
