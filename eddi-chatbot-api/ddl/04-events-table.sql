-- ============================================
-- Events Table DDL
-- ============================================
-- This table is used by Rasa to store conversation events
-- It tracks user interactions, intents, and actions for conversation flow

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    sender_id VARCHAR(255) NOT NULL,
    type_name VARCHAR(255) NOT NULL,
    timestamp DOUBLE PRECISION,
    intent_name VARCHAR(255),
    action_name VARCHAR(255),
    data TEXT
);

-- ============================================
-- Indexes for Events Table
-- ============================================

-- Index on sender_id for fast lookup of events by conversation
CREATE INDEX ix_events_sender_id ON events (sender_id);

-- ============================================
-- Comments for Events Table
-- ============================================

COMMENT ON TABLE events IS 'Stores conversation events for Rasa NLU tracking and analysis';
COMMENT ON COLUMN events.id IS 'Primary key - sequential identifier for the event';
COMMENT ON COLUMN events.sender_id IS 'Identifier for the conversation/user sending the event';
COMMENT ON COLUMN events.type_name IS 'Type of event (user message, bot response, action, etc.)';
COMMENT ON COLUMN events.timestamp IS 'Unix timestamp when the event occurred';
COMMENT ON COLUMN events.intent_name IS 'Detected intent name (if applicable)';
COMMENT ON COLUMN events.action_name IS 'Action executed (if applicable)';
COMMENT ON COLUMN events.data IS 'Additional event data in text format';