import { useMemo } from "react";
import type { Conversacion } from "@/lib/types";

export type InboxMetrics = {
  tasaContencion: number; // 0–100 integer
  pedidosHoy: number; // integer count
  ticketPromedio: number; // 2 decimal places
  derivadosHumano: number; // integer count
};

export function useInboxMetrics(conversaciones: Conversacion[]): InboxMetrics {
  return useMemo(() => {
    const total = conversaciones.length;

    if (total === 0) {
      return {
        tasaContencion: 0,
        pedidosHoy: 0,
        ticketPromedio: 0,
        derivadosHumano: 0,
      };
    }

    const derivadosHumano = conversaciones.filter(
      (c) => c.estado === "revision"
    ).length;

    const tasaContencion = Math.round(((total - derivadosHumano) / total) * 100);

    const conOrden = conversaciones.filter((c) => c.total > 0);
    const pedidosHoy = conOrden.length;

    const ticketPromedio =
      pedidosHoy > 0
        ? Math.round((conOrden.reduce((sum, c) => sum + c.total, 0) / pedidosHoy) * 100) / 100
        : 0;

    return {
      tasaContencion,
      pedidosHoy,
      ticketPromedio,
      derivadosHumano,
    };
  }, [conversaciones]);
}
