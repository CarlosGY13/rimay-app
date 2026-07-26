"use client";

import type { ComponentType, SVGProps } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/app/components/ui/Card";
import { useBusiness } from "@/app/context/BusinessContext";
import type { Rubro } from "@/lib/types";
import { SparklesIcon, AlertIcon } from "@/app/components/icons";
import { InsightsSection } from "./InsightsSection";

type MetricaRubro = {
  resueltas: string; // % de conversaciones resueltas sin intervención humana
  escalados: string; // casos escalados a revisión humana
};

// MOCK: reemplazar con métricas reales calculadas desde conversaciones/analytics.
// Por ahora son valores fijos y plausibles según el rubro configurado.
const METRICAS_POR_RUBRO: Record<Rubro, MetricaRubro> = {
  restaurante: { resueltas: "82%", escalados: "5" },
  ropa: { resueltas: "76%", escalados: "8" },
  veterinaria: { resueltas: "68%", escalados: "11" },
  belleza: { resueltas: "74%", escalados: "9" },
  generico: { resueltas: "70%", escalados: "7" },
};

type TarjetaMeta = {
  titulo: string;
  descripcion: string;
  valor: (m: MetricaRubro) => string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  acento: string;
  fondoIcono: string;
};

const TARJETAS: TarjetaMeta[] = [
  {
    titulo: "Resueltas sin intervención",
    descripcion: "Conversaciones que el agente cerró solo, sin un humano.",
    valor: (m) => m.resueltas,
    icon: SparklesIcon,
    acento: "text-brand-600",
    fondoIcono: "bg-brand-50",
  },
  {
    titulo: "Casos escalados a revisión",
    descripcion: "Consultas que pasaron a un operador humano.",
    valor: (m) => m.escalados,
    icon: AlertIcon,
    acento: "text-amber-600",
    fondoIcono: "bg-amber-50",
  },
];

function ResumenContent() {
  const { config } = useBusiness();
  const rubro: Rubro = config.rubro ?? "generico";
  const metricas = METRICAS_POR_RUBRO[rubro];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <PageHeader
        eyebrow="Resumen"
        title="Impacto de tu agente"
        description="Una vista simulada del valor que Rimay genera para tu negocio."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {TARJETAS.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.titulo} className="p-6">
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${t.fondoIcono}`}
              >
                <Icon className={`h-5 w-5 ${t.acento}`} />
              </div>
              <div className={`text-3xl font-semibold tracking-tight ${t.acento}`}>
                {t.valor(metricas)}
              </div>
              <div className="mt-2 text-sm font-medium text-ink-900">
                {t.titulo}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                {t.descripcion}
              </p>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-400">
        Datos simulados con fines de demostración. Se actualizarán con métricas
        reales cuando el agente esté conectado a tus canales.
      </p>

      {/* Insights de conversaciones — se llena al cerrar conversaciones */}
      <InsightsSection />
    </div>
  );
}

export default function ResumenPage() {
  return (
    <RequireConfig>
      <ResumenContent />
    </RequireConfig>
  );
}
