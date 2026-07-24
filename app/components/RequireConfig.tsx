"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/app/context/BusinessContext";
import { Button } from "@/app/components/ui/Button";

// Controla el acceso a las páginas internas:
// - mientras carga la config desde la API, muestra un spinner;
// - si la conexión falla (p. ej. Postgres caído), muestra un error entendible;
// - si ya cargó pero no hay rubro configurado, redirige al onboarding.
export default function RequireConfig({ children }: { children: ReactNode }) {
  const { isConfigured, loading, error, retry } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !error && !isConfigured) {
      router.replace("/onboarding");
    }
  }, [loading, error, isConfigured, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-ink-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" />
          Cargando tu negocio…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-sm rounded-2xl border border-ink-200/70 bg-white p-8 text-center shadow-card">
          <h2 className="text-base font-semibold text-ink-900">
            No se pudo conectar con el servidor
          </h2>
          <p className="mt-2 text-sm text-ink-500">{error}</p>
          <Button className="mt-5" onClick={retry}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-ink-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" />
          Redirigiendo al onboarding…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
