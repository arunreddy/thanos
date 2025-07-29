-- ============================================
-- Conversations Table DDL
-- ============================================
-- This table stores conversation/chat sessions between users and the EDDI chatbot
-- Each conversation contains multiple messages and has metadata for tracking

CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    topic VARCHAR(100),
    rasa_sender_id VARCHAR(255),
    message_count INTEGER NOT NULL DEFAULT 0,
    conversation_metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_conversation_status CHECK (status IN ('active', 'archived', 'deleted')),
    CONSTRAINT fk_conversations_user_id FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- Indexes for Conversations Table
-- ============================================

-- Index on user_id for fast lookup of user's conversations
CREATE INDEX ix_conversations_user_id ON conversations (user_id);

-- Index on status for filtering conversations by status
CREATE INDEX ix_conversations_status ON conversations (status);

-- Index on topic for conversation categorization
CREATE INDEX ix_conversations_topic ON conversations (topic);

-- Index on created_at for chronological ordering
CREATE INDEX ix_conversations_created_at ON conversations (created_at);

-- Index on last_message_at for sorting by recent activity
CREATE INDEX ix_conversations_last_message_at ON conversations (last_message_at);

-- Unique index on rasa_sender_id for Rasa integration
CREATE UNIQUE INDEX ix_conversations_rasa_sender_id ON conversations (rasa_sender_id);

-- ============================================
-- Comments for Conversations Table
-- ============================================

COMMENT ON TABLE conversations IS 'Stores conversation sessions between users and the EDDI chatbot';
COMMENT ON COLUMN conversations.id IS 'Primary key - UUID identifier for the conversation';
COMMENT ON COLUMN conversations.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN conversations.title IS 'User-friendly title for the conversation (max 500 chars)';
COMMENT ON COLUMN conversations.description IS 'Optional longer description of the conversation';
COMMENT ON COLUMN conversations.status IS 'Status of conversation: active, archived, or deleted';
COMMENT ON COLUMN conversations.topic IS 'Category/topic of the conversation for organization';
COMMENT ON COLUMN conversations.rasa_sender_id IS 'Unique identifier used by Rasa for conversation tracking';
COMMENT ON COLUMN conversations.message_count IS 'Cached count of messages in this conversation';
COMMENT ON COLUMN conversations.conversation_metadata IS 'Additional metadata stored as JSON';
COMMENT ON COLUMN conversations.created_at IS 'Timestamp when conversation was created';
COMMENT ON COLUMN conversations.updated_at IS 'Timestamp when conversation was last updated';
COMMENT ON COLUMN conversations.last_message_at IS 'Timestamp of the last message in this conversation';