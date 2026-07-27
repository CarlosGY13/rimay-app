"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
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
  TrashIcon,
  CheckIcon,
} from "@/app/components/icons";

type Filtro = "activos" | "pendientes" | "revision" | "completado" | "cancelado";

const TABS: { value: Filtro; label: string }[] = [
  { value: "activos", label: "Activos" },
  { value: "pendientes", label: "Pendientes" },
  { value: "revision", label: "Requiere atención" },
  { value: "completado", label: "Completados" },
  { value: "cancelado", label: "Cancelados" },
];

type EstadoMeta = {
  label: string;
  tone: "info" | "warning" | "danger" | "success" | "neutral";
};

const ESTADO_META: Record<EstadoConversacion, EstadoMeta> = {
  nuevo: { label: "Nuevo", tone: "info" },
  preparacion: { label: "Operador en control", tone: "warning" },
  revision: { label: "Requiere revisión", tone: "danger" },
  preparando: { label: "En preparación", tone: "info" },
  completado: { label: "Completado", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
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
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, Partial<Conversacion>>
  >({});
  const [filtro, setFiltro] = useState<Filtro>("activos");
  const [convs, setConvs] = useState<Conversacion[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [panelSessionId, setPanelSessionId] = useState<string | null>(null);

  // Fuente única: /api/conversations (Postgres). Se refresca cada 2s para que
  // el inbox sea "en vivo" — nuevos mensajes, pedidos y cambios de estado
  // aparecen solos, sin recargar la página.
  const fetchConvs = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConvs(data.conversations ?? []);
        // Limpiamos los overrides optimistas que el servidor ya confirmó, para
        // no arrastrar estado viejo.
        setLocalOverrides((prev) => {
          if (Object.keys(prev).length === 0) return prev;
          const next = { ...prev };
          let changed = false;
          for (const c of data.conversations ?? []) {
            const ov = next[c.id];
            if (ov && ov.estado && ov.estado === c.estado) {
              delete next[c.id];
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    } catch {
      // silent fail — el polling reintenta
    }
  }, []);

  useEffect(() => {
    fetchConvs();
    const interval = setInterval(fetchConvs, 2000);
    return () => clearInterval(interval);
  }, [fetchConvs]);

  const conversaciones: Conversacion[] = useMemo(() => {
    return convs
      .map((c) => (localOverrides[c.id] ? { ...c, ...localOverrides[c.id] } : c))
      .filter((c) => !removedIds.has(c.id));
  }, [convs, localOverrides, removedIds]);

  const metrics = useInboxMetrics(conversaciones);

  const visibles = useMemo(() => {
    let lista: Conversacion[];
    switch (filtro) {
      case "activos":
        lista = conversaciones.filter(
          (c) => c.estado !== "completado" && c.estado !== "cancelado"
        );
        break;
      case "pendientes":
        lista = conversaciones.filter(
          (c) => c.estado === "nuevo" || c.estado === "preparacion"
        );
        break;
      case "revision":
        lista = conversaciones.filter((c) => c.estado === "revision");
        break;
      case "completado":
        lista = conversaciones.filter((c) => c.estado === "completado");
        break;
      case "cancelado":
        lista = conversaciones.filter((c) => c.estado === "cancelado");
        break;
      default:
        lista = conversaciones;
    }
    return [...lista].sort((a, b) => a.minutosAtras - b.minutosAtras);
  }, [conversaciones, filtro]);

  const conteoPendientes = conversaciones.filter(
    (c) => c.estado === "nuevo" || c.estado === "preparacion"
  ).length;
  const conteoRevision = conversaciones.filter(
    (c) => c.estado === "revision"
  ).length;
  const conteoResueltos = conversaciones.filter(
    (c) => c.estado === "completado"
  ).length;
  const conteoCancelados = conversaciones.filter(
    (c) => c.estado === "cancelado"
  ).length;

  function tomarChat(id: string) {
    // Todas las conversaciones viven en la DB: abrimos el panel de handoff
    // (toma el control y muestra el historial / motivo del caso).
    setPanelSessionId(id);
  }

  // Cambia el estado de una conversación de forma optimista (con rollback).
  async function cambiarEstado(id: string, estado: EstadoConversacion) {
    setLocalOverrides((prev) => ({ ...prev, [id]: { estado } }));
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  // Genera el insight de una conversación cerrada (fire-and-forget). El
  // servidor extrae el aprendizaje y actualiza la agregación de /resumen.
  function dispararInsight(id: string) {
    fetch("/api/insights/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id }),
    }).catch(() => {
      // silent — no bloquea el cierre de la conversación
    });
  }

  // "En preparación": pedido aceptado, en preparación/envío. La IA sigue activa.
  function marcarPreparando(id: string) {
    cambiarEstado(id, "preparando");
  }

  // "Completar": cierra el chat (terminal). Próximo mensaje = sesión nueva.
  function marcarCompletado(id: string) {
    if (panelSessionId === id) setPanelSessionId(null);
    cambiarEstado(id, "completado");
    dispararInsight(id);
  }

  // "Cancelar": envía una despedida al cliente y cierra (terminal).
  async function cancelarChat(id: string) {
    setLocalOverrides((prev) => ({ ...prev, [id]: { estado: "cancelado" } }));
    if (panelSessionId === id) setPanelSessionId(null);
    try {
      const res = await fetch("/api/chat/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      if (!res.ok) throw new Error();
      // Conversación cerrada: generamos su insight.
      dispararInsight(id);
    } catch {
      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function descartar(id: string) {
    // Optimista: lo saca del inbox.
    setRemovedIds((prev) => new Set(prev).add(id));
    if (panelSessionId === id) setPanelSessionId(null);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      // Revertir si falló
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
          let badge: number | null = null;
          if (tab.value === "pendientes" && conteoPendientes > 0)
            badge = conteoPendientes;
          if (tab.value === "revision" && conteoRevision > 0)
            badge = conteoRevision;
          if (tab.value === "completado" && conteoResueltos > 0)
            badge = conteoResueltos;
          if (tab.value === "cancelado" && conteoCancelados > 0)
            badge = conteoCancelados;
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
                    activo
                      ? "bg-white/20"
                      : tab.value === "revision"
                        ? "bg-red-100 text-red-700"
                        : "bg-ink-100 text-ink-600",
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

                    {/* Pedido confirmado (cuando el cliente cerró un pedido) */}
                    {conv.total > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
                        <CheckIcon className="h-3.5 w-3.5" />
                        Pedido confirmado · S/ {conv.total.toFixed(2)}
                        {conv.metodoPago && <span>· Pago: {conv.metodoPago}</span>}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs text-ink-400">
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {tiempoRelativo(conv.minutosAtras)}
                        </span>
                        <span>{canal.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {requiereRevision && (
                          <Button size="sm" onClick={() => tomarChat(conv.id)}>
                            Tomar el chat
                          </Button>
                        )}
                        {(conv.canal === "web" || conv.canal === "telegram") &&
                          !requiereRevision && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setPanelSessionId(conv.id)}
                            >
                              Ver chat
                            </Button>
                          )}
                        {conv.estado !== "completado" &&
                          conv.estado !== "cancelado" && (
                            <>
                              {conv.estado !== "preparando" && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => marcarPreparando(conv.id)}
                                  title="Pedido aceptado: en preparación / envío (la IA sigue atendiendo)"
                                >
                                  En preparación
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => marcarCompletado(conv.id)}
                                title="Cerrar el chat: pedido completado"
                              >
                                Completar
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => cancelarChat(conv.id)}
                                title="Cancelar: avisa al cliente y cierra el chat"
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                        <button
                          type="button"
                          onClick={() => descartar(conv.id)}
                          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Descartar"
                          title="Descartar (quitar del inbox sin avisar al cliente)"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
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
