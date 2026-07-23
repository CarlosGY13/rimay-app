"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/app/context/BusinessContext";

// Redirige a /onboarding si todavía no se ha elegido un rubro.
export default function RequireConfig({ children }: { children: ReactNode }) {
  const { isConfigured } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!isConfigured) {
      router.replace("/onboarding");
    }
  }, [isConfigured, router]);

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
