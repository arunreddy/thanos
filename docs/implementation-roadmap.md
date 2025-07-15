# Implementation Roadmap: User Conversation Tracking

## Overview

This document outlines the phased implementation plan for migrating from in-memory conversation storage to a persistent, user-centric conversation tracking system that supports the hybrid LLM + Rasa architecture.

## Implementation Strategy

### Approach: Incremental Migration
- **Zero-downtime deployment**: New system runs alongside existing
- **Feature flags**: Progressive rollout with ability to rollback
- **Backwards compatibility**: Maintain existing API during transition
- **Data preservation**: Migrate existing conversations without loss

### Risk Mitigation
- **Rollback plan**: Quick revert to in-memory system if issues arise
- **Performance monitoring**: Track response times and error rates
- **Load testing**: Validate system under expected user load
- **Data backup**: Full backup before each migration phase

## Phase 1: Foundation Setup (Week 1-2)

### Goals
- Create database schema and models
- Set up basic infrastructure
- Implement core database operations

### Tasks

#### Database Setup
```bash
# Create database migrations
cd eddi-chatbot-api
uv add sqlalchemy alembic psycopg2-binary
mkdir app/models app/database alembic/versions
```

**Day 1-2: Database Models**
- [ ] Create SQLAlchemy models (`app/models/`)
  - [ ] `User` model with authentication fields
  - [ ] `Conversation` model with metadata
  - [ ] `Message` model with content and analytics fields
- [ ] Set up Alembic for database migrations
- [ ] Create initial migration scripts

**Day 3-4: Database Connection**
- [ ] Configure database connection pool
- [ ] Add environment variables for database configuration
- [ ] Create database utility functions
- [ ] Add health check endpoint for database connectivity

**Day 5-7: Core Operations**
- [ ] Implement user CRUD operations
- [ ] Implement conversation CRUD operations  
- [ ] Implement message CRUD operations
- [ ] Add proper error handling and logging

### Deliverables
- [ ] Database schema created and migrated
- [ ] SQLAlchemy models with proper relationships
- [ ] Database connection and health checks
- [ ] Core CRUD operations with tests

### Testing
```bash
# Unit tests for database operations
uv run pytest app/tests/test_models.py
uv run pytest app/tests/test_database.py

# Integration tests with test database
uv run pytest app/tests/test_integration.py
```

### Success Criteria
- [ ] All database operations pass unit tests
- [ ] Database migrations run successfully
- [ ] Health check endpoint returns 200
- [ ] Connection pool handles concurrent requests

## Phase 2: Enhanced Chat Service (Week 3-4)

### Goals
- Replace in-memory storage with database persistence
- Maintain existing API compatibility
- Add user management capabilities

### Tasks

#### ChatService Refactoring
**Day 1-3: Database Integration**
- [ ] Update `ChatService` to use database instead of memory
- [ ] Implement user lookup/creation logic
- [ ] Add conversation management methods
- [ ] Maintain Rasa integration compatibility

**Day 4-5: User Management**
- [ ] Add user authentication utilities
- [ ] Implement user session management
- [ ] Add user preference storage
- [ ] Create user activity tracking

**Day 6-7: Migration Utilities**
- [ ] Create script to migrate existing in-memory conversations
- [ ] Add conversation import/export functionality
- [ ] Implement data validation and cleanup

### Code Changes

#### Updated ChatService
```python
# app/services/chat_service.py
class ChatService:
    def __init__(self, db_session):
        self.db = db_session
        self.rasa_connector = RasaConnector()
    
    async def process_message(self, message: str, user_id: str, conversation_id: Optional[str] = None):
        # Get or create user
        user = await self.get_or_create_user(user_id)
        
        # Get or create conversation
        conversation = await self.get_or_create_conversation(user.id, conversation_id)
        
        # Send to Rasa
        rasa_response = await self.rasa_connector.send_message(message, conversation.rasa_sender_id)
        
        # Store messages in database
        await self.store_message(conversation.id, "user", message)
        await self.store_message(conversation.id, "assistant", response, model_used="rasa")
        
        return response
```

#### Database Models
```python
# app/models/conversation.py
class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    rasa_sender_id = Column(String(255), unique=True)
    # ... other fields
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")
```

### Deliverables
- [ ] Refactored ChatService using database
- [ ] User management functionality
- [ ] Conversation management functionality
- [ ] Migration scripts for existing data

### Testing
```bash
# Test database ChatService
uv run pytest app/tests/test_chat_service_db.py

# Test user management
uv run pytest app/tests/test_user_management.py

# Integration tests with Rasa
uv run pytest app/tests/test_rasa_integration.py
```

### Success Criteria
- [ ] Existing chat functionality works with database backend
- [ ] User conversations persist across service restarts
- [ ] Migration script successfully imports existing conversations
- [ ] Performance meets existing benchmarks (< 500ms response time)

## Phase 3: New API Endpoints (Week 5-6)

### Goals
- Implement user-centric conversation API
- Add conversation management features
- Prepare for frontend integration

### Tasks

#### API Development
**Day 1-3: User Endpoints**
- [ ] `GET /api/v1/users/me` - Get current user
- [ ] `PUT /api/v1/users/me` - Update user preferences
- [ ] Add JWT authentication middleware
- [ ] Implement rate limiting

**Day 4-6: Conversation Endpoints**
- [ ] `GET /api/v1/conversations` - List user conversations
- [ ] `POST /api/v1/conversations` - Create new conversation
- [ ] `GET /api/v1/conversations/{id}` - Get conversation details
- [ ] `PUT /api/v1/conversations/{id}` - Update conversation
- [ ] `DELETE /api/v1/conversations/{id}` - Delete conversation

**Day 7: Message Endpoints**
- [ ] `GET /api/v1/conversations/{id}/messages` - Get conversation messages
- [ ] `POST /api/v1/conversations/{id}/messages` - Send message
- [ ] Add pagination and filtering
- [ ] Implement real-time message streaming

### API Implementation

#### Router Setup
```python
# app/api/v1/conversations.py
from fastapi import APIRouter, Depends, HTTPException
from app.services.chat_service import ChatService
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])

@router.get("", response_model=List[ConversationSummary])
async def list_conversations(
    user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None
):
    # Implementation
    pass

@router.post("", response_model=ConversationDetail)
async def create_conversation(
    request: CreateConversationRequest,
    user: User = Depends(get_current_user)
):
    # Implementation
    pass
```

### Deliverables
- [ ] Complete REST API for conversation management
- [ ] Authentication and authorization middleware
- [ ] API documentation with OpenAPI/Swagger
- [ ] Rate limiting and error handling

### Testing
```bash
# API endpoint tests
uv run pytest app/tests/test_api_v1.py

# Authentication tests
uv run pytest app/tests/test_auth.py

# Load testing
uv run locust --host=http://localhost:8000
```

### Success Criteria
- [ ] All API endpoints return correct responses
- [ ] Authentication properly protects user data
- [ ] API handles edge cases and errors gracefully
- [ ] Rate limiting prevents abuse
- [ ] API documentation is complete and accurate

## Phase 4: Frontend Integration (Week 7-8)

### Goals
- Update frontend to use new conversation API
- Implement conversation switching UI
- Add real-time message updates

### Tasks

#### Frontend Updates
**Day 1-3: API Integration**
- [ ] Update API client to use new endpoints
- [ ] Implement user authentication flow
- [ ] Add conversation state management (Jotai)
- [ ] Update existing chat components

**Day 4-6: UI Components**
- [ ] Create conversation list sidebar
- [ ] Add conversation switching functionality
- [ ] Implement conversation settings modal
- [ ] Add conversation search and filtering

**Day 7-8: Real-time Features**
- [ ] Implement WebSocket connection for live updates
- [ ] Add typing indicators
- [ ] Implement message status indicators
- [ ] Add offline support and message queuing

### Frontend Implementation

#### Conversation List Component
```tsx
// eddi-chatbot-web/src/components/ConversationList.tsx
interface ConversationListProps {
  onConversationSelect: (id: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onConversationSelect }) => {
  const [conversations] = useConversations();
  
  return (
    <div className="conversation-list">
      {conversations.map(conv => (
        <ConversationItem 
          key={conv.id}
          conversation={conv}
          onClick={() => onConversationSelect(conv.id)}
        />
      ))}
    </div>
  );
};
```

#### State Management
```typescript
// eddi-chatbot-web/src/store/conversations.ts
import { atom } from 'jotai';

export const conversationsAtom = atom<Conversation[]>([]);
export const currentConversationAtom = atom<string | null>(null);
export const messagesAtom = atom<Record<string, Message[]>>({});
```

### Deliverables
- [ ] Updated frontend with conversation management
- [ ] Conversation switching UI
- [ ] Real-time message updates
- [ ] Mobile-responsive design

### Testing
```bash
# Frontend tests
cd eddi-chatbot-web
pnpm test

# E2E tests
pnpm test:e2e

# Visual regression tests
pnpm test:visual
```

### Success Criteria
- [ ] Users can create and switch between conversations
- [ ] Message history loads correctly for each conversation
- [ ] Real-time updates work reliably
- [ ] UI is responsive and accessible
- [ ] No regressions in existing functionality

## Phase 5: Legacy Migration & Cleanup (Week 9-10)

### Goals
- Migrate all users to new system
- Deprecate legacy endpoints
- Optimize performance and monitoring

### Tasks

#### Migration & Deprecation
**Day 1-3: User Migration**
- [ ] Create user migration script for existing sessions
- [ ] Add migration status tracking
- [ ] Implement gradual migration with feature flags
- [ ] Monitor migration success rates

**Day 4-6: Legacy Support**
- [ ] Add deprecation warnings to legacy endpoints
- [ ] Implement legacy-to-new API bridge
- [ ] Create migration guide for API clients
- [ ] Set deprecation timeline

**Day 7-10: Optimization**
- [ ] Optimize database queries with proper indexing
- [ ] Add query performance monitoring
- [ ] Implement conversation archiving for old data
- [ ] Add comprehensive logging and metrics

### Migration Script
```python
# scripts/migrate_users.py
async def migrate_legacy_conversations():
    """Migrate in-memory conversations to database"""
    
    # Get existing conversations from memory
    legacy_conversations = chat_service.conversations
    
    for conv_id, messages in legacy_conversations.items():
        # Create user if not exists
        user = await get_or_create_user_from_legacy_data(messages)
        
        # Create conversation
        conversation = await create_conversation(
            user_id=user.id,
            title=generate_title_from_messages(messages),
            rasa_sender_id=conv_id
        )
        
        # Migrate messages
        for msg in messages:
            await create_message(
                conversation_id=conversation.id,
                role=msg["role"],
                content=msg["content"],
                created_at=msg.get("timestamp")
            )
```

### Deliverables
- [ ] Complete user and conversation migration
- [ ] Legacy API deprecation plan
- [ ] Performance optimization
- [ ] Monitoring and alerting setup

### Success Criteria
- [ ] 100% of active users migrated successfully
- [ ] Legacy endpoints scheduled for removal
- [ ] System performance meets SLA requirements
- [ ] Comprehensive monitoring in place

## Post-Implementation: Future Enhancements (Week 11+)

### Phase 6: LLM Integration Preparation
- [ ] Add model routing infrastructure
- [ ] Implement confidence scoring system
- [ ] Create LLM connector abstraction
- [ ] Add cost tracking for API usage

### Phase 7: Advanced Features
- [ ] Conversation search across all user conversations
- [ ] Conversation sharing and collaboration
- [ ] Advanced analytics dashboard
- [ ] Conversation export/import functionality

### Phase 8: Performance & Scale
- [ ] Implement conversation data archiving
- [ ] Add read replicas for query performance
- [ ] Implement caching layer (Redis)
- [ ] Add horizontal scaling capabilities

## Monitoring & Success Metrics

### Technical Metrics
- **Response Time**: < 500ms for 95th percentile
- **Availability**: 99.9% uptime
- **Error Rate**: < 0.1% error rate
- **Database Performance**: < 100ms query time

### User Experience Metrics
- **Conversation Retention**: > 80% of conversations have > 3 messages
- **User Adoption**: > 90% of users create multiple conversations
- **Feature Usage**: Conversation switching used by > 70% of users
- **User Satisfaction**: > 4.5/5 rating for conversation management

### Business Metrics
- **Data Integrity**: 100% message delivery and storage
- **System Reliability**: Zero data loss incidents
- **Development Velocity**: Features delivered on schedule
- **Technical Debt**: No increase in complexity metrics

## Risk Management

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Database performance issues | High | Medium | Load testing, query optimization, read replicas |
| Migration data loss | High | Low | Backup strategy, incremental migration, rollback plan |
| Rasa integration breaking | Medium | Low | Comprehensive integration tests, fallback mechanisms |
| API compatibility issues | Medium | Medium | Backwards compatibility testing, feature flags |

### Timeline Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Development delays | Medium | Medium | Buffer time built in, parallel development tracks |
| Testing bottlenecks | Medium | Low | Automated testing, early testing integration |
| Frontend complexity | Low | Medium | Incremental UI updates, component reuse |

## Success Criteria Summary

### Phase 1-2: Foundation ✅
- [ ] Database schema implemented and tested
- [ ] ChatService migrated to use database
- [ ] Existing functionality preserved
- [ ] Performance benchmarks met

### Phase 3-4: User Features ✅
- [ ] New API endpoints operational
- [ ] Frontend conversation management working
- [ ] User authentication implemented
- [ ] Real-time features functional

### Phase 5: Production Ready ✅
- [ ] All users migrated successfully
- [ ] Legacy systems deprecated
- [ ] Performance optimized
- [ ] Monitoring and alerting active

This roadmap provides a structured approach to implementing user conversation tracking while minimizing risk and maintaining system reliability throughout the migration process.