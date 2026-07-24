# Design Document — Métricas operativas en el Inbox

## Overview

A lightweight metrics panel computed reactively from the `conversaciones` array in `BusinessContext`. No new state, no API calls — just a pure computation hook and a presentational component.

## Architecture

```
BusinessContext (conversaciones[])
        │
        ▼
 useInboxMetrics() — pure hook, derives 4 KPIs
        │
        ▼
 <MetricsPanel />  — 4 responsive KPI cards
        │
        ▼
 Rendered at top of InboxContent (app/inbox/page.tsx)
```

## Components

### 1. `useInboxMetrics` hook

**File:** `app/inbox/useInboxMetrics.ts`

```typescript
type InboxMetrics = {
  tasaContencion: number;   // 0–100 integer
  pedidosHoy: number;       // integer count
  ticketPromedio: number;   // 2 decimal places
  derivadosHumano: number;  // integer count
};

function useInboxMetrics(conversaciones: Conversacion[]): InboxMetrics;
```

**Logic:**
- `tasaContencion` = `Math.round(((total - revision) / total) * 100)` or 0 if empty
- `pedidosHoy` = count where `conv.total > 0`
- `ticketPromedio` = sum of `conv.total` (where > 0) / pedidosHoy, or 0
- `derivadosHumano` = count where `conv.estado === "revision"`

Uses `useMemo` to avoid recomputation on unrelated re-renders.

### 2. `<MetricsPanel />` component

**File:** `app/inbox/MetricsPanel.tsx`

Props:
```typescript
type MetricsPanelProps = {
  metrics: InboxMetrics;
};
```

Renders a `grid grid-cols-2 md:grid-cols-4 gap-3` with 4 metric cards:

| KPI | Label | Format | Tone |
|-----|-------|--------|------|
| tasaContencion | Contención IA | `{value}%` | brand (blue) if ≥70, neutral otherwise |
| pedidosHoy | Pedidos hoy | `{value}` | neutral |
| ticketPromedio | Ticket promedio | `S/ {value}` | neutral |
| derivadosHumano | Derivados a humano | `{value}` | danger (red) if > 0, neutral otherwise |

Each card: `rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card` — matching the existing `Metric` component style but with conditional color.

## Changes to existing files

### `app/inbox/page.tsx`

- Remove the existing inline `Metric` component and the 3-col grid.
- Import `useInboxMetrics` and `MetricsPanel`.
- Call `useInboxMetrics(conversaciones)` in `InboxContent`.
- Render `<MetricsPanel metrics={metrics} />` where the old grid was.

## File inventory

| Action | File |
|--------|------|
| Create | `app/inbox/useInboxMetrics.ts` |
| Create | `app/inbox/MetricsPanel.tsx` |
| Modify | `app/inbox/page.tsx` |

## Risks / Decisions

- **No persistence:** Metrics reset on reload since conversaciones live in memory. Acceptable for demo.
- **"Hoy" is misleading:** There's no real timestamp on conversations. `pedidosHoy` just counts all orders in the array. For the demo this is fine — it represents "orders in this session."
- **No animations:** Keeping it simple. Could add count-up animation later if desired.
