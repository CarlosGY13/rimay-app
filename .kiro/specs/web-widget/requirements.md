# Requirements Document — Widget Web + Página Demo

## Introduction

This feature adds a public-facing chat widget that businesses can embed on their websites, plus a demo page simulating a restaurant's website with the widget active. It also introduces the first API routes (`/api/chat`) to handle messages server-side. The goal is to demonstrate the full loop: a customer chats on the restaurant's website → the agent responds from the catalog → the conversation appears in the business owner's inbox in real time.

## Glossary

- **Widget**: A floating chat UI (bubble button + expandable chat window) rendered on the customer-facing page.
- **Demo_Page**: A route (`/demo-cliente`) that simulates the restaurant's public website with the Widget embedded.
- **Chat_API**: A Next.js API route (`/api/chat`) that receives a customer message and returns the agent's structured response.
- **Session**: A temporary conversation identified by a session ID, stored in server memory for the duration of the process.
- **Handoff**: When the agent marks `needs_human_review: true` and the conversation is escalated to a human operator in the inbox.

## Requirements

### Requirement 1: Chat API endpoint

**User Story:** As the widget frontend, I need a server endpoint to send customer messages and receive agent responses, so that the chat logic runs server-side and can later be swapped for a real LLM.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/chat` with a JSON body containing `sessionId` (string) and `message` (string), THE Chat_API SHALL return a JSON response with `texto` (string), `order` (OrderSummary | null), and `needs_human_review` (boolean).
2. WHEN the Chat_API receives a message, IT SHALL use the mock agent logic (catalog keyword matching) to generate the response, using the default restaurant catalog from `data/catalog.json`.
3. WHEN the Chat_API determines `needs_human_review: true`, IT SHALL store the conversation in the server-side session store with estado "revision".
4. WHEN a `sessionId` is not provided, THE Chat_API SHALL generate a new session ID and return it in the response.
5. THE Chat_API SHALL store conversation history per session in memory (acceptable for demo; no database required).

### Requirement 2: Chat widget UI

**User Story:** As a restaurant customer visiting the business website, I want to chat with an AI agent to ask about the menu and place orders, without leaving the page.

#### Acceptance Criteria

1. THE Widget SHALL render as a floating circular button in the bottom-right corner of the page.
2. WHEN the user clicks the button, THE Widget SHALL expand into a chat window with a message list and text input.
3. WHEN the user sends a message, THE Widget SHALL call the Chat_API and display the agent's response.
4. WHEN the Chat_API returns an order (order is not null), THE Widget SHALL display a visual order summary card with item names, prices, and total.
5. WHEN the Chat_API returns `needs_human_review: true`, THE Widget SHALL display a message indicating a human will follow up shortly.
6. THE Widget SHALL show a typing indicator while waiting for the API response.
7. THE Widget SHALL be implemented as a standalone page at `/widget` that can also be embedded via iframe.

### Requirement 3: Demo customer page

**User Story:** As a hackathon presenter, I want a simulated restaurant website with the chat widget active, so that I can demonstrate the end-to-end flow to judges.

#### Acceptance Criteria

1. THE Demo_Page SHALL be accessible at `/demo-cliente`.
2. THE Demo_Page SHALL display a simple restaurant landing page with the business name, a hero image placeholder, and a brief menu preview.
3. THE Demo_Page SHALL embed the Widget in the bottom-right corner.
4. THE Demo_Page SHALL use the restaurant rubro styling (warm colors, food-related imagery/icons).
5. THE Demo_Page SHALL NOT require authentication or prior configuration to access (it uses the default catalog).

### Requirement 4: Real-time inbox integration

**User Story:** As a business owner viewing the inbox, I want to see conversations from the web widget appear in real time, so that I can monitor and intervene when needed.

#### Acceptance Criteria

1. WHEN a customer sends a message via the Widget, THE conversation SHALL appear in the inbox with canal = "web".
2. WHEN the conversation is marked `needs_human_review`, IT SHALL appear in the inbox with estado = "revision".
3. THE inbox SHALL show the customer's session as "Cliente web" (since there's no real identity).
4. WHEN a new message arrives via the widget while the inbox is open, THE inbox SHALL update without requiring a page reload (polling every 3 seconds is acceptable for the demo).
