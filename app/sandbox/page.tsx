"use client";

import { useEffect, useRef, useState } from "react";
import RequireConfig from "@/app/components/RequireConfig";
import PageHeader from "@/app/components/PageHeader";
import { useBusiness } from "@/app/context/BusinessContext";
import { generarRespuestaMock, type AgentResponse } from "@/lib/mockAgent";
import type { ChatMessage, OrderSummary } from "@/lib/types";
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

function SandboxContent() {
  const { config, addConversacion } = useBusiness();
  const [mensajes, setMensajes] = useState<ChatMessage[]>([
    mensajeInicial(config.nombre),
  ]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<OrderSummary | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderSummary | null>(null);
  const [humanReview, setHumanReview] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  // MOCK: recuerda el último texto escalado a inbox para no duplicar si el
  // cliente repite exactamente el mismo mensaje sin coincidencia seguido.
  const ultimoEscaladoRef = useRef<string | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo, confirmedOrder, humanReview]);

  function enviar() {
    const contenido = texto.trim();
    if (contenido.length === 0 || escribiendo) return;

    const msgUsuario: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      texto: contenido,
    };
    setMensajes((prev) => [...prev, msgUsuario]);
    setTexto("");
    setEscribiendo(true);

    // Check if user is confirming a pending order
    const msgNorm = contenido.toLowerCase();
    const esConfirmacion =
      pendingOrder &&
      (msgNorm.includes("sí") ||
        msgNorm.includes("si") ||
        msgNorm.includes("confirmo") ||
        msgNorm.includes("dale") ||
        msgNorm.includes("ok") ||
        msgNorm.includes("confirmar"));

    const delay = 800 + Math.random() * 400;
    setTimeout(() => {
      if (esConfirmacion && pendingOrder) {
        // Confirm the order
        setConfirmedOrder(pendingOrder);
        setPendingOrder(null);
        // Push to inbox
        addConversacion({
          cliente: "Cliente sandbox",
          resumen: pendingOrder.items.map((i) => i.nombre).join(", "),
          total: pendingOrder.total,
          minutosAtras: 0,
          canal: "web",
          estado: "nuevo",
        });
        setMensajes((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "agent",
            texto: "¡Perfecto! Tu pedido ha sido confirmado. Te llegará un resumen al canal correspondiente. 🎉",
          },
        ]);
      } else {
        const response: AgentResponse = generarRespuestaMock(contenido, config);
        setMensajes((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "agent", texto: response.texto },
        ]);
        if (response.order) {
          setPendingOrder(response.order);
          setConfirmedOrder(null);
        }
        if (response.needs_human_review) {
          setHumanReview(true);
          setPendingOrder(null);
        }
        // MOCK: si el bot no reconoció el mensaje, escalar la conversación al
        // inbox como "revisión". Dedup: saltar si repite el mismo texto.
        if (response.sinCoincidencia) {
          if (ultimoEscaladoRef.current !== contenido) {
            ultimoEscaladoRef.current = contenido;
            addConversacion({
              cliente: "Cliente web",
              resumen: contenido,
              total: 0,
              minutosAtras: 0,
              canal: "web",
              estado: "revision",
            });
          }
        }
      }
      setEscribiendo(false);
    }, delay);
  }

  function reiniciar() {
    setMensajes([mensajeInicial(config.nombre)]);
    setEscribiendo(false);
    setTexto("");
    setPendingOrder(null);
    setConfirmedOrder(null);
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

          {/* Order confirmed card */}
          {confirmedOrder && <OrderCard order={confirmedOrder} />}

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

function OrderCard({ order }: { order: OrderSummary }) {
  return (
    <div className="animate-slide-up mx-auto w-full max-w-sm rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
          <CheckIcon className="h-4 w-4 text-emerald-700" />
        </div>
        <span className="text-sm font-semibold text-emerald-800">
          Pedido confirmado
        </span>
      </div>
      <ul className="mb-3 space-y-1.5">
        {order.items.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between text-sm text-ink-700"
          >
            <span>{item.nombre}</span>
            <span className="font-medium">S/ {item.precio.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-emerald-100 pt-2">
        <span className="text-sm font-semibold text-ink-900">Total</span>
        <span className="text-base font-bold text-emerald-700">
          S/ {order.total.toFixed(2)}
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-400">
        Este pedido fue enviado al inbox del negocio
      </p>
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
