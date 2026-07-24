"use client";

import { useEffect, useRef, useState } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
import { useBusiness } from "@/app/context/BusinessContext";
import type { ChatMessage } from "@/lib/types";
import type { AIMessage } from "@/lib/ai/provider";
import { Button } from "@/app/components/ui/Button";
import {
  SendIcon,
  SparklesIcon,
  CheckIcon,
  AlertIcon,
} from "@/app/components/icons";

function mensajeInicial(nombre: string): ChatMessage {
  const negocio = nombre.trim().length > 0 ? nombre.trim() : "nuestro negocio";
  return {
    id: "welcome",
    role: "agent",
    texto: `¡Hola! Soy el agente de ${negocio}. Pregúntame por nuestros productos o servicios y te ayudo al instante.`,
  };
}

type SandboxReply = {
  reply: string;
  needsHumanReview: boolean;
  reviewReason: string | null;
};

function SandboxContent() {
  const { config, addConversacion } = useBusiness();
  const [mensajes, setMensajes] = useState<ChatMessage[]>([
    mensajeInicial(config.nombre),
  ]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [humanReview, setHumanReview] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  // Recuerda el último texto escalado a inbox para no duplicar si el cliente
  // repite exactamente el mismo mensaje sin resolución seguido.
  const ultimoEscaladoRef = useRef<string | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo, humanReview]);

  async function enviar() {
    const contenido = texto.trim();
    if (contenido.length === 0 || escribiendo) return;

    // Historial previo (antes de este mensaje) para dar contexto al modelo.
    const historial: AIMessage[] = mensajes
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.texto }));

    const msgUsuario: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      texto: contenido,
    };
    setMensajes((prev) => [...prev, msgUsuario]);
    setTexto("");
    setEscribiendo(true);

    let data: SandboxReply;
    try {
      const res = await fetch("/api/sandbox/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: contenido, history: historial }),
      });
      data = (await res.json()) as SandboxReply;
    } catch {
      // El endpoint ya cae a un fallback seguro; esto cubre un error de red.
      data = {
        reply: "Dame un momento, ya te ayudo.",
        needsHumanReview: true,
        reviewReason: "Error de red al contactar al asistente.",
      };
    }

    setMensajes((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: "agent", texto: data.reply },
    ]);

    if (data.needsHumanReview) {
      setHumanReview(true);
      // Escalar a inbox como "revisión", guardando el motivo en el resumen.
      // Dedup: saltar si repite el mismo mensaje sin resolución.
      if (ultimoEscaladoRef.current !== contenido) {
        ultimoEscaladoRef.current = contenido;
        addConversacion({
          cliente: "Cliente web",
          resumen: data.reviewReason ?? contenido,
          total: 0,
          minutosAtras: 0,
          canal: "web",
          estado: "revision",
        });
      }
    } else {
      setHumanReview(false);
    }

    setEscribiendo(false);
  }

  function reiniciar() {
    setMensajes([mensajeInicial(config.nombre)]);
    setEscribiendo(false);
    setTexto("");
    setHumanReview(false);
    ultimoEscaladoRef.current = null;
  }

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col px-6 py-8">
      <PageHeader
        eyebrow="Sandbox"
        title="Prueba tu agente"
        description="Conversa como lo haría un cliente real."
        action={
          <Button variant="secondary" size="sm" onClick={reiniciar}>
            Reiniciar
          </Button>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card">
        {/* Barra del chat */}
        <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-3.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <SparklesIcon className="h-4 w-4" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink-900">
              {config.nombre.trim().length > 0
                ? config.nombre.trim()
                : "Tu agente"}
            </div>
            <div className="text-xs text-emerald-600">En línea</div>
          </div>
        </div>

        {/* Human review banner */}
        {humanReview && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3">
            <AlertIcon className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Requiere revisión humana
              </p>
              <p className="text-xs text-amber-600">
                El agente no puede resolver esta consulta automáticamente. Un operador debe intervenir.
              </p>
            </div>
            <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              needs_human_review
            </span>
          </div>
        )}

        {/* Mensajes */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {mensajes.map((msg) => (
            <Burbuja key={msg.id} mensaje={msg} />
          ))}

          {escribiendo && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3">
                <Punto delay="0ms" />
                <Punto delay="150ms" />
                <Punto delay="300ms" />
              </div>
            </div>
          )}

          <div ref={finRef} />
        </div>

        {/* Input */}
        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2 py-1.5 shadow-soft transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviar();
              }}
              placeholder="Escribe un mensaje…"
              className="flex-1 bg-transparent px-2 text-sm text-ink-900 outline-none placeholder:text-ink-400"
            />
            <Button
              size="sm"
              onClick={enviar}
              disabled={escribiendo || texto.trim().length === 0}
              className="h-9 w-9 px-0"
              aria-label="Enviar"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Burbuja({ mensaje }: { mensaje: ChatMessage }) {
  const esUsuario = mensaje.role === "user";
  return (
    <div
      className={
        esUsuario
          ? "flex animate-slide-up justify-end"
          : "flex animate-slide-up flex-col items-start"
      }
    >
      <div
        className={[
          "max-w-[82%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          esUsuario
            ? "rounded-br-md bg-brand-600 text-white shadow-soft"
            : "rounded-bl-md bg-ink-100 text-ink-800",
        ].join(" ")}
      >
        {mensaje.texto}
      </div>
      {!esUsuario && mensaje.id !== "welcome" && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
          <CheckIcon className="h-3 w-3" />
          respuesta basada en tu catálogo configurado
        </span>
      )}
    </div>
  );
}

function Punto({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-ink-400"
      style={{
        animation: "bounce2 1s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  );
}

export default function SandboxPage() {
  return (
    <RequireConfig>
      <SandboxContent />
    </RequireConfig>
  );
}
