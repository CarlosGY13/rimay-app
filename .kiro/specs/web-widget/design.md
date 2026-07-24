# Design Document — Widget Web + Página Demo

## Overview

Adds the first API route, a standalone chat widget, and a demo page. Uses an in-memory store for conversations so the inbox can poll for updates. No database, no external dependencies.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│  /demo-cliente      │         │  /portal (inbox)          │
│  (restaurant page)  │         │  (business owner)         │
│                     │         │                           │
│  ┌───────────────┐  │         │  GET /api/conversations   │
│  │  Widget chat  │──┼── POST /api/chat ──►┐              │
│  └───────────────┘  │         │           │              │
└─────────────────────┘         │           ▼              │
                                │  In-memory session store  │
                                │  (conversationStore.ts)   │
                                └──────────────────────────┘
```

## File Inventory

| Action | File | Purpose |
|--------|------|---------|
| Create | `lib/conversationStore.ts` | In-memory store for widget sessions/conversations |
| Create | `app/api/chat/route.ts` | POST endpoint — receives message, returns agent response |
| Create | `app/api/conversations/route.ts` | GET endpoint — returns active conversations for inbox polling |
| Create | `app/widget/page.tsx` | Standalone chat widget page (also embeddable via iframe) |
| Create | `app/demo-cliente/page.tsx` | Simulated restaurant website with widget embedded |
| Modify | `app/inbox/page.tsx` | Add polling to fetch web conversations from API |

## Component Details

### 1. `lib/conversationStore.ts` — In-memory session store

```typescript
type WidgetSession = {
  id: string;
  mensajes: { role: "user" | "agent"; texto: string }[];
  resumen: string;       // last order summary or last message snippet
  total: number;         // order total or 0
  estado: EstadoConversacion;
  updatedAt: number;     // Date.now() timestamp
};

// Module-level Map (persists while Next.js server runs)
const sessions = new Map<string, WidgetSession>();

export function getOrCreateSession(sessionId?: string): WidgetSession;
export function addMessage(sessionId: string, role: "user" | "agent", texto: string): void;
export function markNeedsReview(sessionId: string): void;
export function updateOrderInfo(sessionId: string, resumen: string, total: number): void;
export function getAllSessions(): WidgetSession[];
```

Rationale: Module-level `Map` works because Next.js API routes share the same Node process in dev. Resets on server restart — acceptable for demo.

### 2. `app/api/chat/route.ts`

**POST** body:
```json
{ "sessionId": "optional-string", "message": "quiero un combo familiar" }
```

**Response:**
```json
{
  "sessionId": "abc123",
  "texto": "¡Hola! ...",
  "order": { "items": [...], "total": 65, "canal": "web", "needs_human_review": false } | null,
  "needs_human_review": false
}
```

Logic:
1. Get or create session from store.
2. Add user message to session.
3. Call `generarRespuestaMock(message, catalogConfig)` — uses a hardcoded config based on `data/catalog.json`.
4. Add agent response to session.
5. If `needs_human_review`, mark session.
6. If order exists, update session resumen/total.
7. Return response.

### 3. `app/api/conversations/route.ts`

**GET** response:
```json
{
  "conversations": [
    { "id": "abc123", "cliente": "Cliente web", "resumen": "...", "total": 65, "minutosAtras": 2, "canal": "web", "estado": "nuevo" }
  ]
}
```

Transforms `WidgetSession[]` into `Conversacion[]` format for the inbox.

### 4. `app/widget/page.tsx` — Chat widget

A client component with:
- Floating button (bottom-right, 56px circle, brand gradient)
- Expandable chat panel (360px wide, 500px tall on desktop)
- Message list with bubbles (same style as sandbox)
- Text input + send button
- Typing indicator during fetch
- Order card when order returned
- "Un operador te atenderá pronto" message on human review
- Stores `sessionId` in `useState` (new session per page load)

Standalone page (no layout chrome/sidebar) so it can be iframed.

### 5. `app/demo-cliente/page.tsx` — Restaurant demo page

A simple, visually appealing page:
- Full-width hero with warm gradient background
- Restaurant name ("El Pato Feliz") + tagline
- 3 featured menu items as cards (pulled from catalog.json statically)
- Footer with hours/address (fake)
- `<iframe src="/widget" />` positioned fixed bottom-right, or the widget component rendered directly

No sidebar, no app shell — this is a "customer-facing" page.

### 6. Inbox polling (modification to `app/inbox/page.tsx`)

Add a `useEffect` with `setInterval` (3000ms) that:
1. Calls `GET /api/conversations`
2. Merges web conversations into the existing `conversaciones` from context
3. Deduplicates by ID

This way conversations from both the sandbox (context) and the widget (API) appear together.

## Data Flow

```
Customer types in widget
  → POST /api/chat
  → conversationStore saves message + response
  → Widget shows response

Business owner views inbox
  → useEffect polls GET /api/conversations every 3s
  → Merges with context conversations
  → New web conversations appear in list
```

## Decisions & Tradeoffs

- **In-memory store**: Resets on server restart. Fine for demo, would be Redis/DB in production.
- **No auth**: Widget is open, no customer identity. Shows "Cliente web" in inbox.
- **No WebSocket**: Polling every 3s is simpler and sufficient for a demo. Production would use SSE or WebSocket.
- **Hardcoded catalog in API**: The API reads `data/catalog.json` directly instead of depending on the React context. This is correct because the API runs server-side.
- **Widget as separate page**: Allows iframe embedding AND standalone use. The demo page can either iframe it or import the component directly.
