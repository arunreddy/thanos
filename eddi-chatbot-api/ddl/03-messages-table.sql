-- ============================================
-- Messages Table DDL
-- ============================================
-- This table stores individual messages within conversations
-- Includes support for user messages, assistant responses, and system messages

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

-- ============================================
-- Indexes for Messages Table
-- ============================================

-- Index on conversation_id for fast lookup of messages within a conversation
CREATE INDEX ix_messages_conversation_id ON messages (conversation_id);

-- Index on role for filtering messages by sender type
CREATE INDEX ix_messages_role ON messages (role);

-- Index on created_at for chronological ordering of messages
CREATE INDEX ix_messages_created_at ON messages (created_at);

-- Index on intent_name for analyzing conversation patterns
CREATE INDEX ix_messages_intent_name ON messages (intent_name);

-- Index on model_used for tracking which AI models were used
CREATE INDEX ix_messages_model_used ON messages (model_used);

-- ============================================
-- Comments for Messages Table
-- ============================================

COMMENT ON TABLE messages IS 'Stores individual messages within conversations between users and the EDDI chatbot';
COMMENT ON COLUMN messages.id IS 'Primary key - UUID identifier for the message';
COMMENT ON COLUMN messages.conversation_id IS 'Foreign key reference to conversations table';
COMMENT ON COLUMN messages.role IS 'Role of message sender: user, assistant, or system';
COMMENT ON COLUMN messages.content IS 'The actual message content/text';
COMMENT ON COLUMN messages.model_used IS 'Name of the AI model used to generate this message (if assistant)';
COMMENT ON COLUMN messages.intent_name IS 'Detected intent from NLU processing (if applicable)';
COMMENT ON COLUMN messages.confidence_score IS 'Confidence score for intent detection (0.00 to 1.00)';
COMMENT ON COLUMN messages.response_time_ms IS 'Time in milliseconds to generate the response';
COMMENT ON COLUMN messages.buttons IS 'Interactive buttons/options provided with the message (JSON)';
COMMENT ON COLUMN messages.custom_data IS 'Additional custom data associated with the message (JSON)';
COMMENT ON COLUMN messages.parent_message_id IS 'Reference to parent message for threading/context';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when message was created';
COMMENT ON COLUMN messages.message_metadata IS 'Additional metadata about the message (JSON)';