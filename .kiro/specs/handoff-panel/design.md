# Design Document — Panel de Handoff (Human-in-the-Loop)

## Overview

Adds a slide-over panel to the inbox for viewing conversation history and sending operator messages. Also modifies the Chat API to respect an "AI paused" flag so it stops auto-responding when a human takes over.

## Architecture

```
Inbox page
  ├── conversation list (existing)
  └── <HandoffPanel /> (new, slide-over)
           │
           ├── GET /api/chat/history?sessionId=x  → fetch messages
           ├── POST /api/chat/operator             → send operator message
           └── POST /api/chat/release              → return to AI
```

## File Inventory

| Action | File | Purpose |
|--------|------|---------|
| Create | `app/inbox/HandoffPanel.tsx` | Slide-over panel component |
| Create | `app/api/chat/history/route.ts` | GET — returns message history for a session |
| Create | `app/api/chat/operator/route.ts` | POST — stores an operator message |
| Create | `app/api/chat/release/route.ts` | POST — releases session back to AI |
| Modify | `lib/conversationStore.ts` | Add `paused` flag, `addOperatorMessage`, `releaseSession` functions |
| Modify | `app/api/chat/route.ts` | Skip auto-response if session is paused |
| Modify | `app/inbox/page.tsx` | Open HandoffPanel on conversation click |

## Component Details

### 1. `lib/conversationStore.ts` — Changes

Add to `WidgetSession`:
```typescript
paused: boolean;  // true when operator has taken over
```

New exports:
```typescript
export function pauseSession(sessionId: string): void;
export function releaseSession(sessionId: string): void;
export function getSession(sessionId: string): WidgetSession | undefined;
```

The existing `markNeedsReview` already sets estado to "revision". `pauseSession` sets `paused = true` and estado to "preparacion". `releaseSession` sets `paused = false` and estado to "completado".

### 2. `app/api/chat/route.ts` — Changes

After getting the session, check `session.paused`:
```typescript
if (session.paused) {
  // Store user message but don't generate agent response
  addMessage(session.id, "user", message);
  return NextResponse.json({
    sessionId: session.id,
    texto: null,
    order: null,
    needs_human_review: false,
    paused: true,
  });
}
```

The widget will handle `texto: null` by not rendering an agent bubble (customer just sees their own message was sent).

### 3. `app/api/chat/history/route.ts` — GET

Query param: `?sessionId=abc123`

Response:
```json
{
  "sessionId": "abc123",
  "mensajes": [
    { "role": "user", "texto": "..." },
    { "role": "agent", "texto": "..." },
    { "role": "operator", "texto": "..." }
  ],
  "estado": "revision",
  "paused": true
}
```

### 4. `app/api/chat/operator/route.ts` — POST

Body:
```json
{ "sessionId": "abc123", "message": "Hola, soy el encargado..." }
```

Logic:
1. Get session, call `pauseSession` if not already paused.
2. `addMessage(sessionId, "operator", message)`.
3. Return updated message list.

### 5. `app/api/chat/release/route.ts` — POST

Body:
```json
{ "sessionId": "abc123" }
```

Logic:
1. Call `releaseSession(sessionId)`.
2. Return `{ success: true }`.

### 6. `app/inbox/HandoffPanel.tsx`

A slide-over panel (fixed right, full height, ~420px wide):

```
┌──────────────────────────────┐
│  ← Cerrar     Cliente web    │  ← Header with close button
│  🟡 IA pausada — Operador    │  ← Status banner
├──────────────────────────────┤
│                              │
│  [message bubbles]           │  ← Scrollable message area
│  - gray bg = customer        │
│  - light blue bg = agent     │
│  - brand bg = operator       │
│                              │
├──────────────────────────────┤
│  [input] [Enviar]            │  ← Operator input
│  [Devolver a IA]             │  ← Release button
└──────────────────────────────┘
```

**Behavior:**
- On open: `GET /api/chat/history?sessionId=x`, display messages.
- On send: `POST /api/chat/operator`, append message to list.
- On "Devolver a IA": `POST /api/chat/release`, close panel.
- Polls history every 3s while open (to show new customer messages in real-time).
- Auto-scrolls to bottom on new messages.

### 7. `app/inbox/page.tsx` — Changes

- Add state: `const [panelSessionId, setPanelSessionId] = useState<string | null>(null)`
- "Tomar el chat" button and clicking a web conversation both call `setPanelSessionId(conv.id)`
- Render `<HandoffPanel sessionId={panelSessionId} onClose={() => setPanelSessionId(null)} />` when non-null
- Remove the existing `tomarChat` function that only changed local estado (the panel handles it now)

### 8. `app/widget/page.tsx` — Minor change

Handle `texto: null` in API response (when session is paused):
```typescript
if (data.texto) {
  // add agent message as before
} else if (data.paused) {
  // optionally show "waiting for operator" or just don't add a bubble
}
```

## Data Flow — Complete Handoff Cycle

```
1. Customer sends "quiero un descuento" via widget
2. POST /api/chat → triggers needs_human_review → session.estado = "revision"
3. Inbox polls GET /api/conversations → shows conversation with red badge
4. Owner clicks "Tomar el chat" → HandoffPanel opens
5. Panel fetches GET /api/chat/history → shows message history
6. Owner types response → POST /api/chat/operator → session.paused = true
7. Customer sends another message → POST /api/chat → detects paused → stores but no AI reply
8. Owner sees new message (panel polls) → responds again
9. Owner clicks "Devolver a IA" → POST /api/chat/release → session.paused = false, estado = "completado"
10. Panel closes, inbox shows conversation as "Completado"
```

## Decisions

- **Polling over WebSocket**: 3s polling for the panel is simple and demo-adequate.
- **"operator" role**: New message role distinct from "agent". The widget can style these differently (or show them the same — for the customer it doesn't matter who responds).
- **No auth**: Any inbox viewer can take over. Fine for single-user demo.
- **Panel doesn't navigate**: It's a slide-over, preserving inbox context underneath.
