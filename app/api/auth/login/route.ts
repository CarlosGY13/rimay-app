import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/auth/token";

export const dynamic = "force-dynamic";

// Error genérico: no revela si el email existe o si la contraseña falló.
const CREDENCIALES_INVALIDAS = NextResponse.json(
  { error: "Correo o contraseña incorrectos." },
  { status: 401 }
);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Igual comparamos contra un hash dummy para no filtrar por timing si
      // el email existe o no (defensa básica).
      await verifyPassword(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinva");
      return CREDENCIALES_INVALIDAS;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return CREDENCIALES_INVALIDAS;

    // ¿El tenant ya tiene configuración (catálogo)? Define el destino post-login.
    const itemsCount = await prisma.catalogItem.count({
      where: { tenantId: user.tenantId },
    });
    const needsOnboarding = itemsCount === 0;

    const token = await createSessionToken({
      userId: user.id,
      tenantId: user.tenantId,
    });

    const res = NextResponse.json({ ok: true, needsOnboarding });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      // TODO: poner secure:true detrás de HTTPS. En el piloto local corre sobre
      // http://localhost, donde secure:true haría que el navegador descarte la cookie.
      secure: false,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    console.error("POST /api/auth/login failed:", e);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión, intentá de nuevo." },
      { status: 500 }
    );
  }
}
