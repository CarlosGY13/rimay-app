# Implementation Plan: Conversation Insights & Rule Suggestions

## Overview

Implement a feedback loop that extracts insights from completed conversations using AI, aggregates them into themed clusters with suggested business rules, and surfaces them on the Resumen page. The implementation follows the existing patterns in the codebase: Prisma for data, Next.js API routes, and the existing AI provider abstraction.

## Tasks

- [ ] 1. Data model — Prisma migration for ConversationInsight and InsightAggregation
  - [ ] 1.1 Add ConversationInsight and InsightAggregation models to prisma/schema.prisma
    - Add `ConversationInsight` model with fields: id, conversationId (unique), tenantId, summary, tags (Json), hadFriction, createdAt
    - Add `InsightAggregation` model with fields: id, tenantId (unique), themes (Json), analyzedCount, createdAt, updatedAt
    - Add relations to Conversation and Tenant models
    - Add index on (tenantId, createdAt) for ConversationInsight
    - Add relation fields on the Tenant model (`insights ConversationInsight[]`, `insightAggregation InsightAggregation?`)
    - Run `npx prisma migrate dev --name add_conversation_insights`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2. AI prompts and schema validation for insight extraction
  - [ ] 2.1 Create lib/ai/insights.ts with extraction prompt builder and output parser
    - Define `InsightExtractionInput` and `InsightExtractionOutput` types
    - Create `buildExtractionPrompt(input: InsightExtractionInput): string` that produces the system prompt for the AI
    - Create `parseInsightOutput(raw: string): InsightExtractionOutput` with validation (summary non-empty ≤500 chars, 1-10 tags, boolean hadFriction)
    - Define the JSON schema constant `OPENAI_INSIGHT_SCHEMA` for structured output
    - _Requirements: 1.2_

  - [ ]* 2.2 Write property test for extraction output validation
    - **Property 1: Extraction produces valid structured output**
    - Generate random JSON strings with varying structures, test that parseInsightOutput correctly validates or rejects them
    - **Validates: Requirements 1.2**

- [ ] 3. AI prompts and schema validation for aggregation
  - [ ] 3.1 Add aggregation prompt builder and output parser to lib/ai/insights.ts
    - Define `AggregationInput`, `AggregationTheme`, and `AggregationOutput` types
    - Create `buildAggregationPrompt(input: AggregationInput): string`
    - Create `parseAggregationOutput(raw: string): AggregationOutput` with validation (1-5 themes, sorted by count desc, count >= 1, suggestedRule non-empty)
    - Define `OPENAI_AGGREGATION_SCHEMA` for structured output
    - _Requirements: 2.2, 2.4, 2.6_

  - [ ]* 3.2 Write property tests for aggregation output validation
    - **Property 2: Aggregation themes are sorted by count descending**
    - **Property 5: Aggregation theme count consistency**
    - Generate random theme arrays, test parseAggregationOutput enforces sorting and count constraints
    - **Validates: Requirements 2.2, 2.6**

- [ ] 4. Checkpoint — Ensure AI prompt layer compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. API route: POST /api/insights/extract
  - [ ] 5.1 Create app/api/insights/extract/route.ts
    - Validate session via `requireSession()`
    - Validate `conversationId` is present and is a valid string
    - Check conversation exists and belongs to authenticated tenant (return 403 if not)
    - Check if ConversationInsight already exists for this conversationId — if yes, return it (idempotency)
    - Load conversation messages; return 400 if no messages
    - Call AI provider with extraction prompt, parse response
    - Store ConversationInsight in DB
    - Load last 20 insights for tenant (ordered by createdAt desc)
    - Call AI provider with aggregation prompt (pass existing business rules for dedup)
    - Upsert InsightAggregation for tenant
    - If aggregation fails, still return the insight with `aggregationUpdated: false`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 2.1, 2.3, 2.5, 6.1, 6.3_

  - [ ]* 5.2 Write property test for extraction idempotency
    - **Property 4: Extraction is idempotent per conversation**
    - Mock the DB and AI, call extract twice for the same conversation, verify the second call returns the existing insight without invoking AI again
    - **Validates: Requirements 1.4, 7.1**

  - [ ]* 5.3 Write property test for tenant isolation
    - **Property 6: Tenant isolation across endpoints**
    - Generate random tenant/conversation pairs, verify cross-tenant requests are rejected with 403
    - **Validates: Requirements 6.1, 6.2**

- [ ] 6. API route: GET /api/insights/aggregation
  - [ ] 6.1 Create app/api/insights/aggregation/route.ts
    - Validate session via `requireSession()`
    - Query InsightAggregation by tenantId
    - Return themes, analyzedCount, updatedAt if found; return `null` if not found
    - _Requirements: 3.1, 3.2, 3.3, 6.2_

  - [ ]* 6.2 Write unit tests for aggregation endpoint
    - Test authenticated request returns correct data shape
    - Test unauthenticated request returns 401
    - Test tenant with no aggregation returns null
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. Checkpoint — Ensure API routes work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Wire "Marcar como resuelto" to trigger extraction
  - [ ] 8.1 Modify app/inbox/page.tsx to fire extraction after release
    - In the `marcarResuelto` function, after the successful `/api/chat/release` call, fire a `fetch("/api/insights/extract", ...)` call with `.catch(console.error)` (fire-and-forget)
    - Do not await the extraction response; do not show errors to the user
    - _Requirements: 5.1, 5.2_

- [ ] 9. Resumen page — "Insights de conversaciones" UI section
  - [ ] 9.1 Create the InsightsSection component and integrate into Resumen page
    - Create a new component (inline or in app/resumen/) that fetches GET /api/insights/aggregation on mount
    - Display a section titled "Insights de conversaciones" with violet/purple accent (e.g., `bg-violet-50`, `text-violet-600`)
    - For each theme: show theme name, count badge, description
    - Add "Agregar como regla" button per theme
    - Handle empty state: "Aún no hay insights. Se generarán cuando marques conversaciones como resueltas."
    - Place the section below the existing metrics cards on the Resumen page
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 9.2 Write property test for theme rendering completeness
    - **Property: Theme rendering includes all required fields**
    - Generate random AggregationTheme arrays, render the component, verify each theme's name, count, and description appear in the output
    - **Validates: Requirements 4.2**

- [ ] 10. Editable rule acceptance flow
  - [ ] 10.1 Add editable rule acceptance UI to InsightsSection
    - When user clicks "Agregar como regla", show an inline editable text input pre-filled with `suggestedRule`
    - Add "Confirmar" and "Cancelar" buttons
    - On confirm, call `addRegla(editedText)` from BusinessContext
    - On success, show brief confirmation and hide the editor
    - Handle the case where the user cancels (hide editor, no action)
    - _Requirements: 4.4, 4.5_

  - [ ]* 10.2 Write unit tests for rule acceptance flow
    - Test pre-fill with suggestedRule text
    - Test confirm calls addRegla with edited text
    - Test cancel hides editor without side effects
    - _Requirements: 4.4, 4.5_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The project uses TypeScript throughout with Next.js App Router conventions
- AI calls reuse the existing `getProvider()` infrastructure from lib/ai/
- UI text facing the user is in Spanish per product conventions; variable/function names in English
- The fire-and-forget pattern in task 8 ensures the inbox UX is never blocked by insight extraction

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2"] },
    { "id": 5, "tasks": ["8.1", "9.1"] },
    { "id": 6, "tasks": ["9.2", "10.1"] },
    { "id": 7, "tasks": ["10.2"] }
  ]
}
```
