import type { InboxMetrics } from "./useInboxMetrics";

type KpiDef = {
  key: keyof InboxMetrics;
  label: string;
  format: (value: number) => string;
  tone: (value: number) => "neutral" | "brand" | "danger";
};

const KPIS: KpiDef[] = [
  {
    key: "tasaContencion",
    label: "Contención IA",
    format: (v) => `${v}%`,
    tone: (v) => (v >= 70 ? "brand" : "neutral"),
  },
  {
    key: "pendientes",
    label: "Pendientes",
    format: (v) => `${v}`,
    tone: (v) => (v > 0 ? "neutral" : "brand"),
  },
  {
    key: "derivadosHumano",
    label: "Requieren atención",
    format: (v) => `${v}`,
    tone: (v) => (v > 0 ? "danger" : "neutral"),
  },
  {
    key: "resueltos",
    label: "Resueltos",
    format: (v) => `${v}`,
    tone: (v) => (v > 0 ? "brand" : "neutral"),
  },
  {
    key: "pedidosHoy",
    label: "Pedidos hoy",
    format: (v) => `${v}`,
    tone: () => "neutral",
  },
  {
    key: "ticketPromedio",
    label: "Ticket promedio",
    format: (v) => `S/ ${v.toFixed(2)}`,
    tone: () => "neutral",
  },
];

const TONE_CLASSES: Record<"neutral" | "brand" | "danger", string> = {
  neutral: "text-ink-900",
  brand: "text-brand-600",
  danger: "text-red-600",
};

export function MetricsPanel({ metrics }: { metrics: InboxMetrics }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {KPIS.map((kpi) => {
        const value = metrics[kpi.key];
        const tone = kpi.tone(value);
        return (
          <div
            key={kpi.key}
            className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card"
          >
            <div
              className={`text-2xl font-semibold tracking-tight ${TONE_CLASSES[tone]}`}
            >
              {kpi.format(value)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-ink-400">
              {kpi.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
