"use client";

import { useCallback, useEffect, useState } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/app/components/ui/Card";
import type { Conversacion } from "@/lib/types";
import { useInboxMetrics } from "@/app/inbox/useInboxMetrics";
import {
  SparklesIcon,
  AlertIcon,
  CheckIcon,
  RocketIcon,
} from "@/app/components/icons";
import { InsightsSection } from "./InsightsSection";

function ResumenContent() {
  const [convs, setConvs] = useState<Conversacion[]>([]);
  const [cargado, setCargado] = useState(false);

  // Métricas reales calculadas desde las conversaciones del tenant.
  const fetchConvs = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConvs(data.conversations ?? []);
      }
    } catch {
      // silent — se reintenta en el próximo ciclo
    } finally {
      setCargado(true);
    }
  }, []);

  useEffect(() => {
    fetchConvs();
    const interval = setInterval(fetchConvs, 5000);
    return () => clearInterval(interval);
  }, [fetchConvs]);

  const m = useInboxMetrics(convs);

  const tarjetas = [
    {
      titulo: "Resueltas sin intervención",
      descripcion: "Conversaciones que el agente manejó sin pasar a una persona.",
      valor: `${m.tasaContencion}%`,
      icon: SparklesIcon,
      acento: "text-brand-600",
      fondoIcono: "bg-brand-50",
    },
    {
      titulo: "Casos que pasaron a una persona",
      descripcion: "Conversaciones marcadas para revisión de un operador.",
      valor: `${m.derivadosHumano}`,
      icon: AlertIcon,
      acento: "text-amber-600",
      fondoIcono: "bg-amber-50",
    },
    {
      titulo: "Pedidos confirmados",
      descripcion: "Conversaciones que terminaron en un pedido con monto.",
      valor: `${m.pedidosHoy}`,
      icon: CheckIcon,
      acento: "text-emerald-600",
      fondoIcono: "bg-emerald-50",
    },
    {
      titulo: "Ticket promedio",
      descripcion: "Monto promedio de los pedidos confirmados.",
      valor: `S/ ${m.ticketPromedio.toFixed(2)}`,
      icon: RocketIcon,
      acento: "text-ink-900",
      fondoIcono: "bg-ink-100",
    },
  ];

  const sinDatos = cargado && convs.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <PageHeader
        eyebrow="Resumen"
        title="Impacto de tu agente"
        description="Métricas reales de tus conversaciones, en vivo."
      />

      {sinDatos && (
        <p className="mb-6 rounded-2xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-400">
          Todavía no hay conversaciones. Las métricas se llenan a medida que tu
          agente atiende clientes.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.titulo} className="p-6">
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${t.fondoIcono}`}
              >
                <Icon className={`h-5 w-5 ${t.acento}`} />
              </div>
              <div className={`text-3xl font-semibold tracking-tight ${t.acento}`}>
                {t.valor}
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
