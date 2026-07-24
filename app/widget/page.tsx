"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderSummary } from "@/lib/types";

type ChatMsg = {
  id: string;
  role: "user" | "agent";
  texto: string;
  order?: OrderSummary | null;
  needs_human_review?: boolean;
};

export default function WidgetPage() {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "agent",
      texto: "¡Hola! Soy el asistente de El Pato Feliz 🍗. ¿En qué te puedo ayudar?",
    },
  ]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, escribiendo]);

  // Poll for operator messages when session exists and chat is open
  useEffect(() => {
    if (!sessionId || !open) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/history?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.mensajes || data.mensajes.length === 0) return;

        setIsPaused(data.paused ?? false);

        // Rebuild messages from server history, preserving the welcome message
        const serverMsgs: ChatMsg[] = data.mensajes.map(
          (m: { role: string; texto: string }, i: number) => ({
            id: `srv-${i}`,
            role: m.role === "operator" ? ("agent" as const) : (m.role as "user" | "agent"),
            texto:
              m.role === "operator"
                ? `👤 Operador: ${m.texto}`
                : m.texto,
          })
        );

        // Replace all messages after welcome with server truth
        setMensajes((prev) => {
          const welcome = prev[0];
          // Only update if server has more messages than we're showing
          if (serverMsgs.length + 1 > prev.length) {
            return [welcome, ...serverMsgs];
          }
          // Also update if an operator message appeared
          const hasOperator = serverMsgs.some(
            (m) => m.texto.startsWith("👤 Operador:")
          );
          if (hasOperator) {
            return [welcome, ...serverMsgs];
          }
          return prev;
        });
      } catch {
        // silent
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, open]);

  async function enviar() {
    const contenido = texto.trim();
    if (contenido.length === 0 || escribiendo) return;

    const msgUsuario: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      texto: contenido,
    };
    setMensajes((prev) => [...prev, msgUsuario]);
    setTexto("");
    setEscribiendo(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: contenido }),
      });
      const data = await res.json();

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      // If session is paused (operator took over), don't show agent bubble
      if (data.texto) {
        const msgAgente: ChatMsg = {
          id: `a-${Date.now()}`,
          role: "agent",
          texto: data.texto,
          order: data.order,
          needs_human_review: data.needs_human_review,
        };
        setMensajes((prev) => [...prev, msgAgente]);
      } else if (data.paused) {
        setMensajes((prev) => [
          ...prev,
          {
            id: `p-${Date.now()}`,
            role: "agent",
            texto: "Un momento, un operador está atendiendo tu consulta…",
          },
        ]);
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "agent",
          texto: "Lo siento, hubo un error. Intenta de nuevo.",
        },
      ]);
    } finally {
      setEscribiendo(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-end justify-end p-4 font-sans">
      {/* Chat panel */}
      {open && (
        <div className="mb-2 mr-0 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
              🍗
            </div>
            <div className="flex-1 leading-tight">
              <div className="text-sm font-semibold text-white">
                El Pato Feliz
              </div>
              <div className="text-xs text-white/80">Asistente virtual</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
              aria-label="Cerrar chat"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {mensajes.map((msg) => (
              <div key={msg.id}>
                <div
                  className={
                    msg.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={[
                      "max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-br-md bg-orange-500 text-white"
                        : "rounded-bl-md bg-gray-100 text-gray-800",
                    ].join(" ")}
                  >
                    {msg.texto}
                  </div>
                </div>

                {/* Order card */}
                {msg.order && (
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="mb-1.5 text-xs font-semibold text-emerald-700">
                      📋 Resumen del pedido
                    </p>
                    <ul className="space-y-1">
                      {msg.order.items.map((item, i) => (
                        <li
                          key={i}
                          className="flex justify-between text-xs text-gray-700"
                        >
                          <span>{item.nombre}</span>
                          <span className="font-medium">
                            S/ {item.precio.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex justify-between border-t border-emerald-200 pt-1.5 text-sm font-semibold text-emerald-800">
                      <span>Total</span>
                      <span>S/ {msg.order.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Human review banner */}
                {msg.needs_human_review && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800">
                      ⏳ Un operador te atenderá en breve.
                    </p>
                  </div>
                )}
              </div>
            ))}

            {escribiendo && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={finRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enviar();
                }}
                placeholder="Escribe tu mensaje…"
                className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={enviar}
                disabled={escribiendo || texto.trim().length === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-40"
                aria-label="Enviar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 12h.01M12 12h.01M16 12h.01" />
          </svg>
        )}
      </button>
    </div>
  );
}
