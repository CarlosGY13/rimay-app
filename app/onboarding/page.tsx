"use client";

import { useRouter } from "next/navigation";
import { useBusiness } from "@/app/context/BusinessContext";
import { RUBROS } from "@/lib/rubros";
import type { Rubro } from "@/lib/types";
import { SparklesIcon } from "@/app/components/icons";

export default function OnboardingPage() {
  const { selectRubro, config } = useBusiness();
  const router = useRouter();

  function elegir(rubro: Rubro) {
    selectRubro(rubro);
    router.push("/portal");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <header className="animate-slide-up text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <SparklesIcon className="h-3.5 w-3.5" />
          Configura tu agente en minutos
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-900">
          ¿A qué se dedica tu negocio?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-500">
          Elige tu rubro y prepararemos tu agente con ejemplos listos para usar.
          Todo es editable después, sin tocar una línea de código.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RUBROS.map((rubro, i) => {
          const activo = config.rubro === rubro.id;
          return (
            <button
              key={rubro.id}
              type="button"
              onClick={() => elegir(rubro.id)}
              style={{ animationDelay: `${i * 60}ms` }}
              className={[
                "group animate-slide-up rounded-2xl border bg-white p-6 text-left shadow-card transition-all duration-200",
                "hover:-translate-y-1 hover:shadow-lift",
                activo
                  ? "border-brand-400 ring-2 ring-brand-200"
                  : "border-ink-200/70 hover:border-brand-300",
              ].join(" ")}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ink-50 to-ink-100 text-2xl ring-1 ring-ink-200/60 transition-transform duration-200 group-hover:scale-105">
                <span aria-hidden>{rubro.icono}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-ink-900">
                {rubro.nombre}
              </h3>
              <p className="mt-1 text-sm text-ink-500">{rubro.descripcion}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Comenzar
                <span aria-hidden>→</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
