# Database Schema Design: Conversation Tracking

## Overview

This document defines the database schema for user-specific conversation tracking in the Thanos Database Observability Chatbot, designed to work alongside Rasa's existing tracker store while preparing for future LLM integration.

## Design Principles

### 1. Model Agnostic
- Schema works with Rasa, LLMs, or any future conversation models
- Track which model handled each message for analytics
- Support multiple concurrent conversation models

### 2. User-Centric Hierarchy
- Users can have multiple conversations (threads)
- Each conversation maintains chronological message history
- Conversations have metadata (titles, topics, status)

### 3. Performance Optimized
- Indexed for fast user-specific queries
- Efficient conversation retrieval and pagination
- Optimized for real-time chat applications

### 4. Analytics Ready
- Track model performance and costs
- Support conversation quality metrics
- Enable A/B testing and routing optimization

## Core Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_active ON users(last_active_at);
```

**Fields:**
- `id`: Primary key, UUID for scalability
- `email`: Unique identifier for authentication
- `display_name`: User-friendly name for UI
- `avatar_url`: Profile picture URL
- `preferences`: User settings (theme, language, etc.)
- `last_active_at`: For user activity analytics

### Conversations Table
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    topic VARCHAR(100), -- e.g., 'database_setup', 'query_optimization', 'schema_exploration'
    rasa_sender_id VARCHAR(255), -- Links to Rasa tracker store
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_topic ON conversations(topic);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);
CREATE INDEX idx_conversations_rasa_sender ON conversations(rasa_sender_id);

-- Composite index for user conversation listing
CREATE INDEX idx_conversations_user_active ON conversations(user_id, status, last_message_at DESC);
```

**Fields:**
- `id`: Primary key, conversation identifier
- `user_id`: Foreign key to users table
- `title`: Auto-generated or user-set conversation title
- `description`: Optional conversation summary
- `status`: active, archived, or deleted
- `topic`: Categorization for analytics and routing
- `rasa_sender_id`: Links to Rasa's tracker store events
- `metadata`: Flexible JSON storage for conversation-specific data
- `last_message_at`: For conversation ordering and activity tracking

### Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used VARCHAR(100), -- 'rasa', 'gpt-4', 'claude-3', etc.
    intent_name VARCHAR(255), -- Rasa intent or LLM-classified intent
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    response_time_ms INTEGER, -- Performance tracking
    buttons JSONB, -- Store button data for assistant messages
    custom_data JSONB DEFAULT '{}', -- Form data, downloads, etc.
    parent_message_id UUID REFERENCES messages(id), -- For threading/replies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_model_used ON messages(model_used);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_intent ON messages(intent_name);

-- Composite index for conversation message retrieval
CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at);
```

**Fields:**
- `id`: Primary key, message identifier
- `conversation_id`: Foreign key to conversations table
- `role`: user, assistant, or system message
- `content`: Message text content
- `model_used`: Which model generated the response (rasa, gpt-4, etc.)
- `intent_name`: Classified intent for analytics
- `confidence_score`: Model confidence in response
- `response_time_ms`: Performance metrics
- `buttons`: JSON array of button data for interactive messages
- `custom_data`: Form responses, download data, etc.
- `parent_message_id`: Support for message threading

## Relationship to Rasa Tracker Store

### Integration Strategy
```sql
-- Link conversations to Rasa events via sender_id
-- Rasa events table: (sender_id, timestamp, type_name, data)
-- Our conversations table: rasa_sender_id maps to Rasa's sender_id

-- Example: Get all Rasa events for a conversation
SELECT e.* FROM rasa_events e
JOIN conversations c ON c.rasa_sender_id = e.sender_id
WHERE c.id = 'conversation-uuid';
```

### Data Flow
1. **Message Received**: Store in both custom messages table and send to Rasa
2. **Rasa Response**: Rasa stores in tracker store, we store in messages table
3. **Conversation Retrieval**: Query our messages table for UI, Rasa store for context

### Benefits of Dual Storage
- **Fast UI Queries**: Structured messages table for conversation lists
- **Rasa Context**: Maintain full Rasa conversation state
- **Analytics**: Rich querying capabilities on custom schema
- **Migration Path**: Easy to migrate away from Rasa in future

## Analytics and Reporting Schema

### Message Performance View
```sql
CREATE VIEW message_performance AS
SELECT 
    m.model_used,
    m.intent_name,
    AVG(m.response_time_ms) as avg_response_time,
    AVG(m.confidence_score) as avg_confidence,
    COUNT(*) as message_count,
    DATE_TRUNC('day', m.created_at) as date
FROM messages m
WHERE m.role = 'assistant'
GROUP BY m.model_used, m.intent_name, DATE_TRUNC('day', m.created_at);
```

### User Activity View
```sql
CREATE VIEW user_activity AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(m.id) as total_messages,
    MAX(c.last_message_at) as last_activity,
    AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at))/60) as avg_conversation_duration_minutes
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id AND m.role = 'user'
GROUP BY u.id, u.email;
```

### Conversation Topics View
```sql
CREATE VIEW conversation_topics AS
SELECT 
    topic,
    COUNT(*) as conversation_count,
    AVG(message_count) as avg_messages_per_conversation,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_duration_minutes
FROM (
    SELECT 
        c.topic,
        c.updated_at,
        c.created_at,
        COUNT(m.id) as message_count
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    GROUP BY c.id, c.topic, c.updated_at, c.created_at
) conversation_stats
GROUP BY topic;
```

## Migration Strategy

### Phase 1: Create Tables
```sql
-- Create tables in order (users → conversations → messages)
-- Add initial indexes for performance
-- Create views for analytics
```

### Phase 2: Data Migration
```sql
-- Migrate existing in-memory conversations to database
-- Create default user for existing conversations
-- Link to existing Rasa tracker store data where possible
```

### Phase 3: Application Integration
```sql
-- Update ChatService to use database instead of memory
-- Implement conversation management APIs
-- Add user authentication and session management
```

## Indexing Strategy

### Query Patterns
1. **User's Conversations**: `WHERE user_id = ? ORDER BY last_message_at DESC`
2. **Conversation Messages**: `WHERE conversation_id = ? ORDER BY created_at ASC`
3. **Recent Activity**: `WHERE last_active_at > ? ORDER BY last_active_at DESC`
4. **Model Performance**: `WHERE model_used = ? AND created_at > ?`

### Index Priorities
1. **Primary Access**: User conversation lists (user_id + last_message_at)
2. **Message Retrieval**: Conversation messages (conversation_id + created_at)
3. **Analytics**: Model performance (model_used + created_at)
4. **Search**: Content search (full-text index on messages.content)

## Storage Estimates

### Message Volume
- **Active Users**: 100 users
- **Messages per Day**: 1,000 messages
- **Message Size**: ~500 bytes average
- **Daily Storage**: ~500KB messages + ~100KB metadata
- **Monthly Storage**: ~18MB total
- **Annual Storage**: ~216MB total

### Scaling Considerations
- **Partitioning**: Partition messages table by created_at (monthly)
- **Archival**: Move old conversations to cold storage
- **Cleanup**: Soft delete with scheduled hard delete

## Security Considerations

### Data Protection
- **User Data**: Encrypt PII in users table
- **Message Content**: Consider encryption for sensitive conversations
- **Access Control**: Row-level security for user data isolation

### Compliance
- **Data Retention**: Configurable retention policies
- **User Deletion**: Cascade deletes for GDPR compliance
- **Audit Trail**: Track data access and modifications

This schema provides a solid foundation for conversation tracking while maintaining flexibility for future enhancements and model integrations.