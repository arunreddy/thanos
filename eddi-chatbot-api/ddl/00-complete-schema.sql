-- ============================================
-- EDDI Chatbot Complete Database Schema
-- ============================================
-- This file contains the complete DDL for the EDDI chatbot database schema
-- Generated from Alembic migration: 0f40ef85d33a_initial_conversation_tracking_schema
-- Validated against actual database structure on 2025-07-15
-- 
-- Tables included:
-- 1. users - User accounts with Okta SSO integration
-- 2. conversations - Chat sessions between users and the chatbot
-- 3. messages - Individual messages within conversations
-- 4. events - Rasa conversation events (created by Rasa)
--
-- Creation Date: 2025-07-15
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    okta_user_id VARCHAR(255),
    preferred_username VARCHAR(255),
    given_name VARCHAR(255),
    family_name VARCHAR(255),
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table indexes
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE UNIQUE INDEX ix_users_okta_user_id ON users (okta_user_id);

-- ============================================
-- 2. CONVERSATIONS TABLE
-- ============================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    topic VARCHAR(100),
    rasa_sender_id VARCHAR(255),
    message_count INTEGER NOT NULL,
    conversation_metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_conversation_status CHECK (status IN ('active', 'archived', 'deleted')),
    CONSTRAINT fk_conversations_user_id FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Conversations table indexes
CREATE INDEX ix_conversations_user_id ON conversations (user_id);
CREATE INDEX ix_conversations_status ON conversations (status);
CREATE INDEX ix_conversations_topic ON conversations (topic);
CREATE INDEX ix_conversations_created_at ON conversations (created_at);
CREATE INDEX ix_conversations_last_message_at ON conversations (last_message_at);
CREATE UNIQUE INDEX ix_conversations_rasa_sender_id ON conversations (rasa_sender_id);

-- ============================================
-- 3. MESSAGES TABLE
-- ============================================

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    model_used VARCHAR(100),
    intent_name VARCHAR(255),
    confidence_score NUMERIC(3, 2),
    response_time_ms INTEGER,
    buttons JSONB,
    custom_data JSONB NOT NULL DEFAULT '{}',
    parent_message_id UUID,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message_metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT check_message_role CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT check_confidence_range CHECK (
        confidence_score IS NULL OR 
        (confidence_score >= 0.00 AND confidence_score <= 1.00)
    ),
    CONSTRAINT fk_messages_conversation_id FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    CONSTRAINT fk_messages_parent_message_id FOREIGN KEY (parent_message_id) REFERENCES messages(id)
);

-- Messages table indexes
CREATE INDEX ix_messages_conversation_id ON messages (conversation_id);
CREATE INDEX ix_messages_role ON messages (role);
CREATE INDEX ix_messages_created_at ON messages (created_at);
CREATE INDEX ix_messages_intent_name ON messages (intent_name);
CREATE INDEX ix_messages_model_used ON messages (model_used);

-- ============================================
-- 4. EVENTS TABLE (Created by Rasa)
-- ============================================

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    sender_id VARCHAR(255) NOT NULL,
    type_name VARCHAR(255) NOT NULL,
    timestamp DOUBLE PRECISION,
    intent_name VARCHAR(255),
    action_name VARCHAR(255),
    data TEXT
);

-- Events table indexes
CREATE INDEX ix_events_sender_id ON events (sender_id);

-- ============================================
-- TABLE COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'Stores user accounts for the EDDI chatbot system with Okta SSO integration';
COMMENT ON TABLE conversations IS 'Stores conversation sessions between users and the EDDI chatbot';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations between users and the EDDI chatbot';
COMMENT ON TABLE events IS 'Stores conversation events for Rasa NLU tracking and analysis';

-- ============================================
-- COLUMN COMMENTS
-- ============================================

-- Users table comments
COMMENT ON COLUMN users.id IS 'Primary key - UUID identifier for the user';
COMMENT ON COLUMN users.email IS 'User email address - used for authentication and identification';
COMMENT ON COLUMN users.display_name IS 'User-friendly display name for the UI';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.okta_user_id IS 'Okta SSO user identifier for authentication';
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSON (theme, notifications, etc.)';

-- Conversations table comments
COMMENT ON COLUMN conversations.id IS 'Primary key - UUID identifier for the conversation';
COMMENT ON COLUMN conversations.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN conversations.title IS 'User-friendly title for the conversation (max 500 chars)';
COMMENT ON COLUMN conversations.status IS 'Status of conversation: active, archived, or deleted';
COMMENT ON COLUMN conversations.rasa_sender_id IS 'Unique identifier used by Rasa for conversation tracking';
COMMENT ON COLUMN conversations.message_count IS 'Cached count of messages in this conversation';

-- Messages table comments
COMMENT ON COLUMN messages.id IS 'Primary key - UUID identifier for the message';
COMMENT ON COLUMN messages.conversation_id IS 'Foreign key reference to conversations table';
COMMENT ON COLUMN messages.role IS 'Role of message sender: user, assistant, or system';
COMMENT ON COLUMN messages.content IS 'The actual message content/text';
COMMENT ON COLUMN messages.model_used IS 'Name of the AI model used to generate this message (if assistant)';
COMMENT ON COLUMN messages.intent_name IS 'Detected intent from NLU processing (if applicable)';
COMMENT ON COLUMN messages.confidence_score IS 'Confidence score for intent detection (0.00 to 1.00)';
COMMENT ON COLUMN messages.buttons IS 'Interactive buttons/options provided with the message (JSON)';
COMMENT ON COLUMN messages.custom_data IS 'Additional custom data associated with the message (JSON)';

-- Events table comments
COMMENT ON COLUMN events.id IS 'Primary key - sequential identifier for the event';
COMMENT ON COLUMN events.sender_id IS 'Identifier for the conversation/user sending the event';
COMMENT ON COLUMN events.type_name IS 'Type of event (user message, bot response, action, etc.)';
COMMENT ON COLUMN events.timestamp IS 'Unix timestamp when the event occurred';
COMMENT ON COLUMN events.intent_name IS 'Detected intent name (if applicable)';
COMMENT ON COLUMN events.action_name IS 'Action executed (if applicable)';
COMMENT ON COLUMN events.data IS 'Additional event data in text format';