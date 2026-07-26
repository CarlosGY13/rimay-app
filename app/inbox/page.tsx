"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
import { useBusiness } from "@/app/context/BusinessContext";
import { useInboxMetrics } from "./useInboxMetrics";
import { MetricsPanel } from "./MetricsPanel";
import { HandoffPanel } from "./HandoffPanel";
import type {
  Conversacion,
  EstadoConversacion,
  CanalOrigen,
} from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import {
  AlertIcon,
  ClockIcon,
  WhatsappIcon,
  InstagramIcon,
  GlobeIcon,
  TelegramIcon,
} from "@/app/components/icons";

type Filtro = "todos" | "nuevo" | "revision";

const TABS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "nuevo", label: "Nuevos" },
  { value: "revision", label: "Requieren revisión" },
];

type EstadoMeta = {
  label: string;
  tone: "info" | "warning" | "danger" | "success";
};

const ESTADO_META: Record<EstadoConversacion, EstadoMeta> = {
  nuevo: { label: "Nuevo", tone: "info" },
  preparacion: { label: "En preparación", tone: "warning" },
  revision: { label: "Requiere revisión", tone: "danger" },
  completado: { label: "Completado", tone: "success" },
};

const CANAL: Record<
  CanalOrigen,
  { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  whatsapp: { label: "WhatsApp", icon: WhatsappIcon },
  instagram: { label: "Instagram", icon: InstagramIcon },
  web: { label: "Web", icon: GlobeIcon },
  telegram: { label: "Telegram", icon: TelegramIcon },
};

function tiempoRelativo(min: number): string {
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  return `hace ${horas} h`;
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function InboxContent() {
  const { conversaciones: contextConvs } = useBusiness();
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, Partial<Conversacion>>
  >({});
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [webConvs, setWebConvs] = useState<Conversacion[]>([]);
  const [panelSessionId, setPanelSessionId] = useState<string | null>(null);

  // Poll /api/conversations every 3s for widget messages
  const fetchWebConvs = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setWebConvs(data.conversations ?? []);
      }
    } catch {
      // silent fail — polling will retry
    }
  }, []);

  useEffect(() => {
    fetchWebConvs();
    const interval = setInterval(fetchWebConvs, 3000);
    return () => clearInterval(interval);
  }, [fetchWebConvs]);

  // Merge context conversations + web widget conversations (deduplicate by id)
  const conversaciones: Conversacion[] = useMemo(() => {
    const contextWithOverrides = contextConvs.map((c) =>
      localOverrides[c.id] ? { ...c, ...localOverrides[c.id] } : c
    );
    const contextIds = new Set(contextWithOverrides.map((c) => c.id));
    const uniqueWeb = webConvs.filter((c) => !contextIds.has(c.id));
    return [...contextWithOverrides, ...uniqueWeb];
  }, [contextConvs, localOverrides, webConvs]);

  const metrics = useInboxMetrics(conversaciones);

  const visibles = useMemo(() => {
    const lista =
      filtro === "todos"
        ? conversaciones
        : conversaciones.filter((c) => c.estado === filtro);
    return [...lista].sort((a, b) => a.minutosAtras - b.minutosAtras);
  }, [conversaciones, filtro]);

  const conteoRevision = conversaciones.filter(
    (c) => c.estado === "revision"
  ).length;

  function tomarChat(id: string) {
    // For web conversations, open the handoff panel
    const isWebConv = webConvs.some((c) => c.id === id);
    if (isWebConv) {
      setPanelSessionId(id);
    } else {
      // For context conversations (sandbox), just change state visually
      setLocalOverrides((prev) => ({
        ...prev,
        [id]: { estado: "preparacion" },
      }));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader
        eyebrow="Live Inbox"
        title="Conversaciones"
        description="Pedidos y mensajes entrantes de todos tus canales."
      />

      {/* Métricas operativas */}
      <MetricsPanel metrics={metrics} />

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const activo = filtro === tab.value;
          const badge =
            tab.value === "revision" && conteoRevision > 0
              ? conteoRevision
              : null;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFiltro(tab.value)}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                activo
                  ? "bg-ink-900 text-white shadow-soft"
                  : "bg-white text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-ink-700",
              ].join(" ")}
            >
              {tab.label}
              {badge !== null && (
                <span
                  className={[
                    "rounded-full px-1.5 text-xs font-semibold",
                    activo ? "bg-white/20" : "bg-red-100 text-red-700",
                  ].join(" ")}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-200 p-12 text-center text-sm text-ink-400">
          No hay conversaciones en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((conv) => {
            const meta = ESTADO_META[conv.estado];
            const requiereRevision = conv.estado === "revision";
            const canal = CANAL[conv.canal];
            const CanalIcon = canal.icon;
            return (
              <li
                key={conv.id}
                className={[
                  "animate-slide-up rounded-2xl border bg-white p-4 shadow-card transition-shadow hover:shadow-lift",
                  requiereRevision ? "border-red-200" : "border-ink-200/70",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-sm font-semibold text-ink-600">
                      {iniciales(conv.cliente)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink-500 shadow-soft ring-1 ring-ink-200">
                      <CanalIcon className="h-3 w-3" />
                    </span>
                  </div>

                  {/* Contenido */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink-900">
                        {conv.cliente}
                      </span>
                      <Badge tone={meta.tone}>
                        {requiereRevision && <AlertIcon className="h-3 w-3" />}
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-600">
                      {conv.resumen}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs text-ink-400">
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {tiempoRelativo(conv.minutosAtras)}
                        </span>
                        <span>{canal.label}</span>
                        {conv.total > 0 && (
                          <span className="font-semibold text-ink-700">
                            S/ {conv.total.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {requiereRevision && (
                        <Button size="sm" onClick={() => tomarChat(conv.id)}>
                          Tomar el chat
                        </Button>
                      )}
                      {conv.canal === "web" && !requiereRevision && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPanelSessionId(conv.id)}
                        >
                          Ver chat
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Handoff Panel */}
      {panelSessionId && (
        <HandoffPanel
          sessionId={panelSessionId}
          onClose={() => setPanelSessionId(null)}
        />
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <RequireConfig>
      <InboxContent />
    </RequireConfig>
  );
}
