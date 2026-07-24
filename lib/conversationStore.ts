import type { EstadoConversacion } from "./types";

export type WidgetMessage = {
  role: "user" | "agent" | "operator";
  texto: string;
};

export type WidgetSession = {
  id: string;
  mensajes: WidgetMessage[];
  resumen: string;
  total: number;
  estado: EstadoConversacion;
  paused: boolean;
  updatedAt: number;
};

// Module-level Map — persists while the Next.js server process runs.
const sessions = new Map<string, WidgetSession>();

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getOrCreateSession(sessionId?: string): WidgetSession {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }
  const id = sessionId ?? generateId();
  const session: WidgetSession = {
    id,
    mensajes: [],
    resumen: "",
    total: 0,
    estado: "nuevo",
    paused: false,
    updatedAt: Date.now(),
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): WidgetSession | undefined {
  return sessions.get(sessionId);
}

export function addMessage(
  sessionId: string,
  role: "user" | "agent" | "operator",
  texto: string
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.mensajes.push({ role, texto });
  session.updatedAt = Date.now();
}

export function markNeedsReview(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.estado = "revision";
  session.updatedAt = Date.now();
}

export function pauseSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.paused = true;
  session.estado = "preparacion";
  session.updatedAt = Date.now();
}

export function releaseSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.paused = false;
  session.estado = "completado";
  session.updatedAt = Date.now();
}

export function updateOrderInfo(
  sessionId: string,
  resumen: string,
  total: number
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.resumen = resumen;
  session.total = total;
  session.updatedAt = Date.now();
}

export function getAllSessions(): WidgetSession[] {
  return Array.from(sessions.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}
