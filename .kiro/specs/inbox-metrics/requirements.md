# Requirements Document

## Introduction

The inbox page (`/inbox`) currently displays basic counts (Activas, Nuevas, Por revisar). This feature replaces those counts with a business-value metrics panel that communicates the "AI operations platform" narrative for a hackathon demo. Metrics are computed from the `conversaciones` array already held in `BusinessContext`, using mock-seeded data plus any sandbox-generated orders.

## Glossary

- **Metrics_Panel**: The UI section at the top of the inbox page that renders operational KPI cards.
- **Metrics_Engine**: The computation logic (a pure function or hook) that derives KPI values from a `Conversacion[]` array.
- **Conversacion**: A single customer interaction record as defined in `lib/types.ts`, containing fields `estado`, `total`, `canal`, etc.
- **Tasa_de_Contencion**: The percentage of conversations resolved by the AI agent without human intervention. Computed as conversations NOT in `revision` state divided by total conversations.
- **Pedidos_Hoy**: The count of conversations that have an order (i.e., `total > 0`).
- **Ticket_Promedio**: The average monetary value of conversations that have a non-zero `total`.
- **Derivados_a_Humano**: The count of conversations in `revision` state, representing those that required human escalation.

## Requirements

### Requirement 1: Compute operational metrics from conversations

**User Story:** As a business owner, I want to see key operational KPIs derived from my conversations, so that I can understand how effectively the AI agent handles customer interactions.

#### Acceptance Criteria

1. WHEN the Metrics_Engine receives a Conversacion array, THE Metrics_Engine SHALL compute Tasa_de_Contencion as the percentage of conversations whose estado is NOT "revision", rounded to the nearest integer.
2. WHEN the Metrics_Engine receives a Conversacion array, THE Metrics_Engine SHALL compute Pedidos_Hoy as the count of conversations where total is greater than zero.
3. WHEN the Metrics_Engine receives a Conversacion array, THE Metrics_Engine SHALL compute Ticket_Promedio as the arithmetic mean of total across conversations where total is greater than zero, rounded to two decimal places.
4. WHEN the Metrics_Engine receives a Conversacion array with no conversations having total greater than zero, THE Metrics_Engine SHALL return Ticket_Promedio as zero.
5. WHEN the Metrics_Engine receives a Conversacion array, THE Metrics_Engine SHALL compute Derivados_a_Humano as the count of conversations whose estado equals "revision".
6. WHEN the Metrics_Engine receives an empty Conversacion array, THE Metrics_Engine SHALL return Tasa_de_Contencion as zero, Pedidos_Hoy as zero, Ticket_Promedio as zero, and Derivados_a_Humano as zero.

### Requirement 2: Display metrics panel on the inbox page

**User Story:** As a business owner, I want to see the operational metrics prominently at the top of my inbox page, so that I can monitor performance at a glance.

#### Acceptance Criteria

1. WHEN the inbox page loads, THE Metrics_Panel SHALL display four KPI cards: Tasa de contención, Pedidos hoy, Ticket promedio, and Derivados a humano.
2. THE Metrics_Panel SHALL display Tasa_de_Contencion with a "%" suffix.
3. THE Metrics_Panel SHALL display Ticket_Promedio with a "S/ " prefix and two decimal places.
4. THE Metrics_Panel SHALL display Pedidos_Hoy and Derivados_a_Humano as integer counts.
5. WHEN the conversaciones array in BusinessContext updates, THE Metrics_Panel SHALL re-render with the newly computed values.

### Requirement 3: Visual hierarchy and styling

**User Story:** As a business owner, I want the metrics panel to feel cohesive with the rest of the application design, so that the experience is professional and easy to scan.

#### Acceptance Criteria

1. THE Metrics_Panel SHALL use a 4-column responsive grid (2 columns on small screens, 4 on medium and above).
2. WHEN Derivados_a_Humano is greater than zero, THE Metrics_Panel SHALL highlight the Derivados_a_Humano card with a warning color (red/danger tone).
3. THE Metrics_Panel SHALL display each KPI card with a descriptive label in Spanish and the computed value prominently above it.
4. THE Metrics_Panel SHALL use the existing Tailwind design tokens (ink, brand, red color scales) and rounded-2xl card styling consistent with the current inbox page.
