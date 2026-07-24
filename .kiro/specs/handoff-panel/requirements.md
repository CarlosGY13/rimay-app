# Requirements Document — Panel de Handoff (Human-in-the-Loop)

## Introduction

When the AI agent flags a conversation as `needs_human_review`, the business owner needs to see the full chat history, take control, respond to the customer manually, and optionally return control to the AI. This feature adds a conversation detail panel to the inbox that enables that workflow.

## Glossary

- **Handoff_Panel**: A modal or slide-over panel that shows the full message history of a conversation and allows the operator to respond.
- **Operator_Message**: A message sent by the human operator (business owner) through the Handoff_Panel, delivered back to the customer via the widget.
- **AI_Paused_State**: A visual indicator and functional state where the AI agent stops auto-responding and the human operator takes over.
- **Return_To_AI**: The action of handing control back to the AI agent after the operator finishes intervening.

## Requirements

### Requirement 1: View conversation history

**User Story:** As a business owner, I want to see the full message history of a conversation when I click on it in the inbox, so that I understand the context before responding.

#### Acceptance Criteria

1. WHEN the operator clicks "Tomar el chat" or clicks on a web conversation in the inbox, THE Handoff_Panel SHALL open showing the full message history of that conversation.
2. THE Handoff_Panel SHALL display each message with a visual distinction between customer messages, AI agent messages, and operator messages.
3. THE Handoff_Panel SHALL show the conversation metadata: customer label ("Cliente web"), channel (web), and current estado.
4. WHEN the conversation has no messages (edge case), THE Handoff_Panel SHALL display an empty state message.

### Requirement 2: Send operator messages

**User Story:** As a business owner, I want to type and send a response to the customer directly from the inbox panel, so that I can resolve issues the AI couldn't handle.

#### Acceptance Criteria

1. THE Handoff_Panel SHALL include a text input and send button at the bottom.
2. WHEN the operator sends a message, IT SHALL be stored in the conversation's message history in the conversationStore with role "operator".
3. WHEN the operator sends a message, IT SHALL appear immediately in the Handoff_Panel message list.
4. WHEN the operator sends a message, THE Widget on the customer's side SHALL receive it on next poll or interaction (acceptable latency for demo).
5. THE conversation estado SHALL change to "preparacion" when the operator sends their first message.

### Requirement 3: AI paused indicator

**User Story:** As a business owner, I want to see clearly that the AI is paused and I'm in control, so that I know my messages will reach the customer instead of the AI responding.

#### Acceptance Criteria

1. WHEN the Handoff_Panel is open and the conversation estado is "revision" or "preparacion", THE Handoff_Panel SHALL display a banner reading "IA pausada — Operador en control".
2. THE banner SHALL be visually distinct (amber/yellow background) to clearly indicate the override state.
3. WHEN the AI is paused, the Chat_API SHALL NOT auto-respond to new customer messages in that session (messages are stored but no agent response is generated).

### Requirement 4: Return control to AI

**User Story:** As a business owner, I want to hand the conversation back to the AI agent once I've resolved the issue, so that routine interactions resume automatically.

#### Acceptance Criteria

1. THE Handoff_Panel SHALL include a "Devolver a IA" button.
2. WHEN the operator clicks "Devolver a IA", THE conversation estado SHALL change to "completado".
3. WHEN the operator clicks "Devolver a IA", THE Handoff_Panel SHALL close.
4. WHEN control is returned, THE Chat_API SHALL resume auto-responding to customer messages in that session.

### Requirement 5: Panel UX and integration

**User Story:** As a business owner, I want the panel to feel integrated with the inbox without losing my place in the conversation list.

#### Acceptance Criteria

1. THE Handoff_Panel SHALL open as a slide-over panel from the right side (or a modal) without navigating away from the inbox page.
2. THE Handoff_Panel SHALL be dismissible by clicking a close button or clicking outside.
3. WHEN the Handoff_Panel is closed without clicking "Devolver a IA", THE conversation SHALL remain in its current estado (no implicit state change).
4. THE Handoff_Panel SHALL auto-scroll to the most recent message on open.
