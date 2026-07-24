"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { CloseIcon, SendIcon, AlertIcon } from "@/app/components/icons";

type Message = {
  role: "user" | "agent" | "operator";
  texto: string;
};

type Props = {
  sessionId: string;
  onClose: () => void;
};

export function HandoffPanel({ sessionId, onClose }: Props) {
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [paused, setPaused] = useState(false);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasPaused = useRef(false);
  const finRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async () => {
    try {
      // Pause on first fetch
      if (!hasPaused.current) {
        hasPaused.current = true;
        await fetch("/api/chat/operator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: null }),
        });
      }

      const res = await fetch(`/api/chat/history?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMensajes(data.mensajes ?? []);
        setPaused(data.paused ?? false);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch + poll every 3s
  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Auto-scroll on new messages
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function enviar() {
    const contenido = texto.trim();
    if (contenido.length === 0 || sending) return;

    setSending(true);
    setTexto("");

    // Optimistic update
    setMensajes((prev) => [...prev, { role: "operator", texto: contenido }]);

    try {
      const res = await fetch("/api/chat/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: contenido }),
      });
      if (res.ok) {
        const data = await res.json();
        setMensajes(data.mensajes ?? []);
        setPaused(data.paused ?? true);
      }
    } catch {
      // revert on error
      await fetchHistory();
    } finally {
      setSending(false);
    }
  }

  async function devolverAIA() {
    try {
      await fetch("/api/chat/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // silent
    }
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-ink-200 bg-white shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Cliente web</h2>
            <p className="text-xs text-ink-400">Sesión: {sessionId.slice(0, 8)}…</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Cerrar panel"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Paused banner */}
        {paused && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5">
            <AlertIcon className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-800">
              IA pausada — Operador en control
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="text-center text-sm text-ink-400">Cargando historial…</p>
          )}

          {!loading && mensajes.length === 0 && (
            <p className="text-center text-sm text-ink-400">Sin mensajes aún.</p>
          )}

          {mensajes.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user"
                  ? "flex justify-start"
                  : msg.role === "operator"
                    ? "flex justify-end"
                    : "flex justify-start"
              }
            >
              <div className="max-w-[80%]">
                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-ink-400">
                  {msg.role === "user"
                    ? "Cliente"
                    : msg.role === "agent"
                      ? "Agente IA"
                      : "Tú (operador)"}
                </span>
                <div
                  className={[
                    "whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "rounded-bl-md bg-gray-100 text-gray-800"
                      : msg.role === "agent"
                        ? "rounded-bl-md bg-blue-50 text-blue-900"
                        : "rounded-br-md bg-brand-600 text-white",
                  ].join(" ")}
                >
                  {msg.texto}
                </div>
              </div>
            </div>
          ))}

          <div ref={finRef} />
        </div>

        {/* Input + actions */}
        <div className="border-t border-ink-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviar();
              }}
              placeholder="Escribe tu respuesta al cliente…"
              className="flex-1 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <Button
              size="sm"
              onClick={enviar}
              disabled={sending || texto.trim().length === 0}
              className="h-10 w-10 px-0"
              aria-label="Enviar"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={devolverAIA}
            className="w-full"
          >
            Devolver a IA
          </Button>
        </div>
      </div>
    </>
  );
}
