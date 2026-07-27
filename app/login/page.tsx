"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Field, Input } from "@/app/components/ui/Field";
import { AlertIcon } from "@/app/components/icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function ingresar() {
    if (enviando) return;
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Correo o contraseña incorrectos.");
        setEnviando(false);
        return;
      }
      // Recarga completa para que el BusinessContext cargue con la sesión nueva.
      window.location.href = data.needsOnboarding ? "/onboarding" : "/portal";
    } catch {
      setError("No se pudo conectar con el servidor, intentá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
            R
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Ingresa a Rimay
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Accede al panel de tu negocio.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card">
          <div className="space-y-4">
            <Field label="Correo">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ingresar();
                }}
                placeholder="tucorreo@negocio.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ingresar();
                }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertIcon className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="w-full"
              onClick={ingresar}
              disabled={enviando || email.trim().length === 0 || password.length === 0}
            >
              {enviando ? "Ingresando…" : "Ingresar"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
