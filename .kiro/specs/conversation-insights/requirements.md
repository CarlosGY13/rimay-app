# Requirements Document

## Introduction

This feature introduces a feedback loop where completed conversations are analyzed by AI to extract friction insights, aggregate them into themed clusters, and surface actionable business rule suggestions on the Resumen page. The goal is for Rimay to learn from real customer interactions and proactively recommend rules that improve future AI responses—without requiring the business owner to read through conversation logs.

## Glossary

- **Insight_Extractor**: The AI-powered component that analyzes a completed conversation's messages and produces a structured insight (summary, tags, hadFriction).
- **Insight_Aggregator**: The AI-powered component that clusters the last 20 insights for a tenant into themed groups with suggested business rules.
- **ConversationInsight**: A database record containing the extracted insight for a single completed conversation.
- **InsightAggregation**: A database record (one per tenant) containing the latest themed clusters and suggested rules.
- **Extract_Endpoint**: The API route `POST /api/insights/extract` that orchestrates insight extraction and aggregation.
- **Aggregation_Endpoint**: The API route `GET /api/insights/aggregation` that serves aggregation data to the UI.
- **Insights_Section**: The UI section on the Resumen page that displays aggregated themes and suggested rules.
- **Tenant**: A business configured in Rimay, identified by a unique tenant ID.
- **Theme**: A recurring pattern identified across multiple insights, with a count, description, and suggested rule.

## Requirements

### Requirement 1: Insight Extraction from Completed Conversations

**User Story:** As a business owner, I want conversations to be automatically analyzed when marked as resolved, so that Rimay learns from real customer interactions without me having to read every conversation.

#### Acceptance Criteria

1. WHEN a conversation is marked as "resuelto" (status transitions to `completado`), THE Extract_Endpoint SHALL accept a request with the conversationId and produce a structured insight.
2. WHEN the Extract_Endpoint receives a valid conversationId, THE Insight_Extractor SHALL analyze the conversation messages and return a summary (non-empty, max 500 characters), 1-10 tags (non-empty strings), and a boolean hadFriction flag.
3. WHEN the Extract_Endpoint successfully extracts an insight, THE system SHALL persist a ConversationInsight record with the summary, tags, hadFriction, tenantId, and conversationId.
4. WHEN the Extract_Endpoint is called for a conversationId that already has a ConversationInsight, THE system SHALL return the existing insight without re-processing (idempotent behavior).
5. IF the conversation has no messages, THEN THE Extract_Endpoint SHALL return HTTP 400 with a descriptive error message.
6. IF the AI provider fails during extraction, THEN THE Extract_Endpoint SHALL return HTTP 500 with a descriptive error without corrupting existing data.

### Requirement 2: Insight Aggregation into Themed Clusters

**User Story:** As a business owner, I want recurring conversation patterns automatically grouped into themes, so that I can see at a glance what issues my customers face most often.

#### Acceptance Criteria

1. WHEN a ConversationInsight is successfully stored, THE Extract_Endpoint SHALL trigger the Insight_Aggregator with the last 20 insights for the tenant.
2. WHEN the Insight_Aggregator runs, THE system SHALL produce 1-5 themed clusters sorted by count descending, where each theme includes a theme name, count (>=1), description, and suggestedRule text.
3. WHEN the Insight_Aggregator produces output, THE system SHALL upsert the InsightAggregation record for the tenant (one record per tenant).
4. WHEN the Insight_Aggregator runs, THE system SHALL pass existing business rules to avoid suggesting duplicate rules.
5. IF the AI provider fails during aggregation, THEN THE system SHALL still preserve the extracted ConversationInsight and return `aggregationUpdated: false`.
6. THE Insight_Aggregator SHALL produce themes where the sum of all theme counts is less than or equal to the number of insights analyzed.

### Requirement 3: Aggregation Data Retrieval

**User Story:** As a business owner, I want to view the latest insight aggregation on my Resumen page, so that I can quickly understand conversation patterns.

#### Acceptance Criteria

1. WHEN the Aggregation_Endpoint is called with a valid session, THE system SHALL return the latest InsightAggregation for the authenticated tenant including themes, analyzedCount, and updatedAt.
2. WHEN no InsightAggregation exists for the tenant, THE Aggregation_Endpoint SHALL return null.
3. THE Aggregation_Endpoint SHALL validate the session and reject unauthenticated requests with HTTP 401.

### Requirement 4: Resumen Page Insights UI

**User Story:** As a business owner, I want to see a dedicated section on the Resumen page showing conversation insights and suggested rules, so that I can act on the patterns Rimay discovers.

#### Acceptance Criteria

1. WHEN the Resumen page loads, THE Insights_Section SHALL fetch aggregation data from the Aggregation_Endpoint and display themed clusters.
2. WHEN themes are displayed, THE Insights_Section SHALL show each theme's name, count, and description with a violet/purple accent style.
3. WHEN no aggregation data exists, THE Insights_Section SHALL display an appropriate empty state message.
4. WHEN the user clicks "Agregar como regla" on a theme, THE Insights_Section SHALL display an editable text field pre-filled with the theme's suggestedRule text.
5. WHEN the user confirms the edited rule text, THE Insights_Section SHALL create a business rule via the existing `addRegla` flow from BusinessContext.

### Requirement 5: Fire-and-Forget Trigger Integration

**User Story:** As an operator, I want the insight extraction to happen automatically and silently when I mark a conversation as resolved, so that it doesn't slow down my inbox workflow.

#### Acceptance Criteria

1. WHEN the "Marcar como resuelto" action completes successfully, THE Inbox SHALL fire a request to the Extract_Endpoint without awaiting its response (fire-and-forget pattern).
2. IF the fire-and-forget request fails, THEN THE Inbox SHALL log the error silently without displaying UI errors or reverting the resolved status.

### Requirement 6: Security and Tenant Isolation

**User Story:** As a business owner, I want my conversation insights to be private to my business, so that no other tenant can access or influence my data.

#### Acceptance Criteria

1. THE Extract_Endpoint SHALL validate that the conversationId belongs to the authenticated tenant before processing.
2. THE Aggregation_Endpoint SHALL only return aggregation data belonging to the authenticated tenant.
3. THE Extract_Endpoint SHALL validate that the request includes a valid session with a tenantId.
4. IF a request targets a conversation not owned by the authenticated tenant, THEN THE Extract_Endpoint SHALL return HTTP 403.

### Requirement 7: Data Model Integrity

**User Story:** As a system, I want insight data to be stored with proper constraints and relationships, so that the data remains consistent and queryable.

#### Acceptance Criteria

1. THE ConversationInsight model SHALL enforce a unique constraint on conversationId (one insight per conversation).
2. THE InsightAggregation model SHALL enforce a unique constraint on tenantId (one aggregation per tenant).
3. THE ConversationInsight model SHALL cascade-delete when its parent Conversation is deleted.
4. THE InsightAggregation model SHALL cascade-delete when its parent Tenant is deleted.
5. THE ConversationInsight model SHALL be indexed on (tenantId, createdAt) for efficient retrieval of recent insights.
