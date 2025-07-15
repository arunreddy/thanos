# API Design: User Conversation Endpoints

## Overview

This document defines the REST API design for user-specific conversation management in the Thanos Database Observability Chatbot, supporting the hybrid LLM + Rasa architecture with comprehensive conversation tracking.

## Design Principles

### 1. RESTful Architecture
- Resource-based URLs following REST conventions
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Meaningful HTTP status codes
- Consistent error response format

### 2. User-Centric Design
- All endpoints require user authentication/identification
- User isolation and data privacy
- Support for multiple conversations per user

### 3. Backwards Compatibility
- Maintain existing `/chat` endpoints during migration
- Graceful deprecation path for legacy endpoints
- Feature flags for progressive rollout

### 4. Future-Proof
- Support for multiple conversation models (Rasa, LLM)
- Extensible message format for new features
- Scalable pagination and filtering

## Authentication & Authorization

### User Identification
```http
# All requests include user identification
Authorization: Bearer <jwt-token>
# OR for development
X-User-ID: user-uuid
X-User-Email: user@example.com
```

### Security Requirements
- JWT token validation for production
- Rate limiting per user
- Input validation and sanitization
- XSS and injection prevention

## Core API Endpoints

### 1. User Management

#### Get Current User
```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "preferences": {
    "theme": "dark",
    "language": "en"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "last_active_at": "2024-01-01T00:00:00Z"
}
```

#### Update User Preferences
```http
PUT /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "John Doe",
  "preferences": {
    "theme": "light",
    "language": "en"
  }
}
```

### 2. Conversation Management

#### List User Conversations
```http
GET /api/v1/conversations
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number of conversations (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (active, archived, deleted)
- `topic`: Filter by conversation topic

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-uuid",
      "title": "Database Setup for E-commerce",
      "description": "PostgreSQL setup and configuration",
      "status": "active",
      "topic": "database_setup",
      "message_count": 12,
      "last_message_at": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T10:00:00Z",
      "last_message_preview": "I'll help you set up PostgreSQL..."
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0,
  "has_more": true
}
```

#### Create New Conversation
```http
POST /api/v1/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Database Question",
  "topic": "query_optimization",
  "initial_message": "How do I optimize this slow query?"
}
```

**Response:**
```json
{
  "conversation": {
    "id": "conv-uuid",
    "title": "New Database Question",
    "topic": "query_optimization",
    "status": "active",
    "created_at": "2024-01-01T12:00:00Z",
    "last_message_at": "2024-01-01T12:00:00Z"
  },
  "initial_response": {
    "id": "msg-uuid",
    "role": "assistant",
    "content": "I'd be happy to help optimize your query...",
    "model_used": "rasa",
    "buttons": [],
    "created_at": "2024-01-01T12:00:01Z"
  }
}
```

#### Get Conversation Details
```http
GET /api/v1/conversations/{conversation_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "conv-uuid",
  "title": "Database Setup for E-commerce",
  "description": "PostgreSQL setup and configuration",
  "status": "active",
  "topic": "database_setup",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z",
  "last_message_at": "2024-01-01T12:00:00Z",
  "metadata": {
    "database_type": "postgresql",
    "complexity": "intermediate"
  }
}
```

#### Update Conversation
```http
PUT /api/v1/conversations/{conversation_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Conversation Title",
  "description": "Updated description",
  "status": "archived"
}
```

#### Delete Conversation
```http
DELETE /api/v1/conversations/{conversation_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Conversation deleted successfully"
}
```

### 3. Message Management

#### Get Conversation Messages
```http
GET /api/v1/conversations/{conversation_id}/messages
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number of messages (default: 50, max: 200)
- `offset`: Pagination offset
- `since`: ISO timestamp for incremental updates
- `role`: Filter by role (user, assistant, system)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "I need help setting up PostgreSQL",
      "created_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "I'll help you set up PostgreSQL. What's your use case?",
      "model_used": "rasa",
      "intent_name": "database_setup",
      "confidence_score": 0.95,
      "response_time_ms": 150,
      "buttons": [
        {
          "title": "E-commerce",
          "payload": "/database_setup{\"type\":\"ecommerce\"}"
        },
        {
          "title": "Analytics",
          "payload": "/database_setup{\"type\":\"analytics\"}"
        }
      ],
      "created_at": "2024-01-01T10:00:01Z"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

#### Send Message
```http
POST /api/v1/conversations/{conversation_id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "I need help optimizing this query: SELECT * FROM users WHERE created_at > '2024-01-01'",
  "metadata": {
    "query_type": "optimization_request"
  }
}
```

**Response:**
```json
{
  "user_message": {
    "id": "msg-uuid",
    "role": "user",
    "content": "I need help optimizing this query...",
    "created_at": "2024-01-01T12:00:00Z"
  },
  "assistant_response": {
    "id": "msg-uuid-2",
    "role": "assistant",
    "content": "I can help optimize that query. Here are some suggestions...",
    "model_used": "gpt-4",
    "intent_name": "query_optimization",
    "confidence_score": 0.92,
    "response_time_ms": 1200,
    "buttons": [
      {
        "title": "Add Index",
        "payload": "/add_index{\"table\":\"users\",\"column\":\"created_at\"}"
      }
    ],
    "custom_data": {
      "suggested_indexes": ["created_at", "status"],
      "estimated_improvement": "75%"
    },
    "created_at": "2024-01-01T12:00:02Z"
  },
  "conversation_updated": {
    "last_message_at": "2024-01-01T12:00:02Z"
  }
}
```

### 4. Legacy Compatibility Endpoints

#### Legacy Chat Endpoint (Backwards Compatibility)
```http
POST /api/chat/send
Content-Type: application/json

{
  "message": "Hello",
  "user_id": "user123",
  "conversation_id": "optional-conv-id"
}
```

**Migration Strategy:**
- Map `user_id` to user lookup/creation
- Map `conversation_id` to new conversation system
- Maintain existing response format
- Add deprecation headers

## Error Handling

### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid conversation ID",
    "details": {
      "field": "conversation_id",
      "reason": "Conversation not found or access denied"
    },
    "request_id": "req-uuid"
  }
}
```

### Error Codes
- `AUTHENTICATION_REQUIRED` (401): Missing or invalid auth token
- `AUTHORIZATION_DENIED` (403): User lacks permission for resource
- `RESOURCE_NOT_FOUND` (404): Conversation/message not found
- `VALIDATION_ERROR` (400): Invalid request format or parameters
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server-side error
- `SERVICE_UNAVAILABLE` (503): Rasa/LLM service unavailable

## Real-time Features

### WebSocket Support (Future)
```javascript
// Connect to conversation updates
const ws = new WebSocket('wss://api.thanos.com/ws/conversations/{conversation_id}');

// Receive real-time message updates
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle new messages, typing indicators, etc.
};
```

### Server-Sent Events (SSE)
```http
GET /api/v1/conversations/{conversation_id}/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

## Rate Limiting

### User Rate Limits
- **Message Sending**: 30 messages per minute
- **Conversation Creation**: 10 conversations per hour
- **API Requests**: 1000 requests per hour

### Response Headers
```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1641024000
```

## Caching Strategy

### Cache Headers
```http
# Conversation list - short cache
Cache-Control: private, max-age=60

# Message history - longer cache with ETag
Cache-Control: private, max-age=300
ETag: "conversation-version-hash"

# User profile - medium cache
Cache-Control: private, max-age=300
```

### Cache Invalidation
- New message → Invalidate conversation cache
- Conversation update → Invalidate conversation and list cache
- User update → Invalidate user profile cache

## Analytics and Monitoring

### Request Tracking
```json
{
  "request_id": "req-uuid",
  "user_id": "user-uuid",
  "endpoint": "/api/v1/conversations",
  "method": "GET",
  "response_time_ms": 45,
  "status_code": 200,
  "model_used": "rasa",
  "conversation_id": "conv-uuid"
}
```

### Metrics Collection
- API response times per endpoint
- User conversation activity patterns
- Model performance (response time, confidence)
- Error rates and types
- Feature usage analytics

## Migration Timeline

### Phase 1: New Endpoints (Week 1-2)
- Implement user and conversation management
- Create message endpoints
- Add authentication layer

### Phase 2: Legacy Bridge (Week 3)
- Implement legacy endpoint compatibility
- Add migration utilities
- Deploy with feature flags

### Phase 3: Frontend Migration (Week 4-5)
- Update frontend to use new endpoints
- Add conversation switching UI
- Implement real-time updates

### Phase 4: Deprecation (Week 6+)
- Add deprecation warnings to legacy endpoints
- Monitor usage and migrate remaining clients
- Remove legacy endpoints after grace period

This API design provides a comprehensive foundation for user conversation management while maintaining compatibility with existing systems and preparing for future enhancements.