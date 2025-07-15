# Conversation Architecture: Hybrid LLM + Rasa Approach

## Overview

This document outlines the hybrid conversation architecture for the Thanos Database Observability Chatbot, designed to leverage both Large Language Models (LLMs) and Rasa for optimal user experience while maintaining structured conversation tracking.

## Current State Analysis

### Existing Implementation
- **Storage**: In-memory conversation storage in `ChatService.conversations` dictionary
- **Persistence**: Rasa tracker store configured with PostgreSQL (`endpoints.yml`)
- **Limitations**: 
  - No user-specific conversation retrieval
  - Conversations lost on service restart
  - No conversation metadata (titles, timestamps)
  - Single conversation thread per user

### Rasa Tracker Store Structure
- **Table**: `events` with `sender_id`, `timestamp`, `type_name`, `data` (JSON)
- **Data**: All conversation events serialized as JSON
- **Indexing**: Indexed on `sender_id` for user-specific queries
- **Limitation**: Flat structure, no conversation hierarchy

## Hybrid Architecture Design

### Why Hybrid LLM + Rasa?

**LLM Strengths:**
- Natural language understanding and reasoning
- Complex database query analysis and optimization advice
- Contextual schema exploration recommendations
- Flexible conversation handling

**Rasa Strengths:**
- Structured workflows (database provisioning, decommissioning)
- Form-based data collection (database requirements)
- Button-based interactions and guided flows
- Reliable intent classification for known patterns
- Cost-effective for structured interactions

### Message Routing Strategy

```
User Message
    ↓
Intent Classification & Confidence Scoring
    ↓
┌─────────────────┬─────────────────┐
│ High Confidence │ Low Confidence  │
│ Known Intent    │ Complex Query   │
│      ↓         │       ↓         │
│   Rasa         │     LLM         │
│  (Structured)   │  (Reasoning)    │
└─────────────────┴─────────────────┘
    ↓                      ↓
Response Generated    Response Generated
    ↓                      ↓
    └──────────┬──────────┘
               ↓
    Store in Custom Tables
         (Model Agnostic)
```

### Routing Decision Matrix

| User Input Type | Confidence | Route To | Fallback |
|----------------|------------|----------|----------|
| "Create database for me" | High | Rasa | N/A |
| "What's the best index for my query?" | Medium | LLM | Rasa |
| "Analyze this query performance" | High | LLM | Rasa |
| "I want to provision PostgreSQL" | High | Rasa | N/A |
| "Help me optimize this complex join" | Low | LLM | Rasa |
| Button/Form interactions | High | Rasa | N/A |

## Future-Proof Design Principles

### 1. Model Agnostic Storage
- Custom conversation tables independent of Rasa or LLM providers
- Track which model handled each message
- Support multiple LLM providers (OpenAI, Anthropic, local models)

### 2. Conversation Hierarchy
```
User
 ├── Conversation 1 (Database Setup)
 │   ├── Message 1 (User): "I need a new database"
 │   ├── Message 2 (Rasa): "I can help with that..."
 │   └── Message 3 (User): "PostgreSQL please"
 ├── Conversation 2 (Query Optimization)
 │   ├── Message 1 (User): "Why is this query slow?"
 │   ├── Message 2 (LLM): "Let me analyze..."
 │   └── Message 3 (User): "How do I add an index?"
 └── Conversation 3 (Schema Exploration)
```

### 3. Analytics and Monitoring
- Track model performance and user satisfaction
- Monitor API costs for LLM usage
- A/B test different routing strategies
- Measure conversation completion rates

### 4. Graceful Degradation
- LLM unavailable → Route to Rasa
- Rasa unavailable → Route to LLM
- Both unavailable → Static fallback responses

## Technical Benefits

### Immediate Benefits
- **User Experience**: Multiple conversation threads per user
- **Persistence**: Conversations survive service restarts
- **Searchability**: Query conversation history across users
- **Metadata**: Conversation titles, timestamps, participant tracking

### Future Benefits
- **Cost Optimization**: Smart routing reduces LLM API costs
- **Quality Improvement**: Compare model performance metrics
- **Scalability**: Add new models without changing storage layer
- **Analytics**: Rich conversation analytics for product insights

## Implementation Strategy

### Phase 1: Custom Conversation Tables
- Create user, conversation, message tables
- Migrate from in-memory to persistent storage
- Maintain Rasa compatibility

### Phase 2: Enhanced Chat Service
- Implement user-specific conversation management
- Add conversation metadata handling
- Create conversation switching logic

### Phase 3: LLM Integration Preparation
- Add model tracking fields
- Implement confidence scoring
- Create routing decision framework

### Phase 4: Hybrid Routing
- Add intent classification layer
- Implement LLM fallback logic
- Create routing analytics

## Success Metrics

### Technical Metrics
- **Response Time**: < 500ms for Rasa, < 2s for LLM
- **Accuracy**: > 90% correct routing decisions
- **Availability**: 99.9% uptime with fallback mechanisms

### User Experience Metrics
- **Conversation Completion**: > 80% of conversations reach resolution
- **User Satisfaction**: Measured through conversation ratings
- **Task Success**: Database operations completed successfully

### Business Metrics
- **Cost Efficiency**: LLM costs < $0.10 per conversation
- **Adoption**: Active users creating multiple conversations
- **Retention**: Users returning for follow-up conversations

## Migration Considerations

### Data Migration
- Existing in-memory conversations → Custom tables
- Preserve conversation context and history
- Maintain user session continuity

### API Compatibility
- Maintain existing API endpoints
- Add new user-specific endpoints
- Graceful deprecation of old patterns

### Testing Strategy
- A/B test hybrid routing vs. Rasa-only
- Load testing with conversation persistence
- Integration testing across model boundaries

This architecture positions Thanos for both immediate improvements and future LLM integration while maintaining the reliability and structure that Rasa provides for database observability workflows.