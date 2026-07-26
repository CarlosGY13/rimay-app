"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { useBusiness } from "@/app/context/BusinessContext";
import type { AggregationTheme } from "@/lib/ai/insights";

type AggregationData = {
  themes: AggregationTheme[];
  analyzedCount: number;
  updatedAt: string;
};

function LightbulbIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
      aria-hidden="true"
      {...props}
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

function ThemeCard({
  theme,
  onAddRule,
}: {
  theme: AggregationTheme;
  onAddRule: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ruleText, setRuleText] = useState(theme.suggestedRule);
  const [added, setAdded] = useState(false);

  function handleConfirm() {
    const trimmed = ruleText.trim();
    if (trimmed.length === 0) return;
    onAddRule(trimmed);
    setEditing(false);
    setAdded(true);
  }

  function handleCancel() {
    setRuleText(theme.suggestedRule);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-violet-200/70 bg-violet-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
              {theme.count}x
            </span>
            <span className="text-sm font-semibold text-ink-900">
              {theme.theme}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
            {theme.description}
          </p>
        </div>
      </div>

      {/* Editable rule acceptance */}
      {!editing && !added && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-dashed border-violet-300 bg-white px-3 py-1.5 text-xs text-ink-500">
            Regla sugerida: &ldquo;{theme.suggestedRule}&rdquo;
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing(true)}
            className="shrink-0 border-violet-200 text-violet-700 hover:bg-violet-100"
          >
            Agregar como regla
          </Button>
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            placeholder="Edita la regla antes de confirmar..."
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleConfirm}>
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {added && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
          <span className="text-xs font-medium text-green-700">
            Regla agregada a tu configuracion
          </span>
        </div>
      )}
    </div>
  );
}

export function InsightsSection() {
  const { addRegla } = useBusiness();
  const [data, setData] = useState<AggregationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAggregation = useCallback(async () => {
    try {
      const res = await fetch("/api/insights/aggregation");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent — no insights is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAggregation();
  }, [fetchAggregation]);

  function handleAddRule(text: string) {
    addRegla(text);
  }

  if (loading) {
    return null; // No flash while loading
  }

  return (
    <div className="mt-8">
      <Card className="border-violet-200/70 p-6 md:p-7">
        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <LightbulbIcon className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-ink-900">
              Insights de conversaciones
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Rimay aprende de las interacciones con tus clientes.
            </p>
          </div>
        </div>

        {/* Content */}
        {!data || data.themes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-violet-200 px-6 py-8 text-center">
            <p className="text-sm text-ink-400">
              Aun no hay insights. Se generaran cuando marques conversaciones como
              resueltas en el Inbox.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {data.themes.map((theme) => (
                <ThemeCard
                  key={theme.theme}
                  theme={theme}
                  onAddRule={handleAddRule}
                />
              ))}
            </div>

            <p className="mt-4 text-xs text-ink-400">
              Basado en {data.analyzedCount} conversacion{data.analyzedCount !== 1 ? "es" : ""} analizadas.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
