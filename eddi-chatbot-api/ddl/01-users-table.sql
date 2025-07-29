-- ============================================
-- Users Table DDL
-- ============================================
-- This table stores user information for the EDDI chatbot system
-- Including Okta authentication integration and user preferences

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

-- ============================================
-- Indexes for Users Table
-- ============================================

-- Unique index on email for fast user lookup and authentication
CREATE UNIQUE INDEX ix_users_email ON users (email);

-- Unique index on Okta user ID for SSO integration
CREATE UNIQUE INDEX ix_users_okta_user_id ON users (okta_user_id);

-- ============================================
-- Comments for Users Table
-- ============================================

COMMENT ON TABLE users IS 'Stores user accounts for the EDDI chatbot system with Okta SSO integration';
COMMENT ON COLUMN users.id IS 'Primary key - UUID identifier for the user';
COMMENT ON COLUMN users.email IS 'User email address - used for authentication and identification';
COMMENT ON COLUMN users.display_name IS 'User-friendly display name for the UI';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.okta_user_id IS 'Okta SSO user identifier for authentication';
COMMENT ON COLUMN users.preferred_username IS 'User preferred username from Okta';
COMMENT ON COLUMN users.given_name IS 'User first name from Okta profile';
COMMENT ON COLUMN users.family_name IS 'User last name from Okta profile';
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSON (theme, notifications, etc.)';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user account was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user account was last updated';
COMMENT ON COLUMN users.last_active_at IS 'Timestamp when user was last active in the system';