# Frontend Integration: User Conversation Management

## Overview

This document outlines the frontend integration strategy for the new user conversation management system in the Thanos Database Observability Chatbot. It covers React component updates, state management, and user experience patterns for the hybrid LLM + Rasa architecture.

## Current Frontend Architecture

### Tech Stack
- **React 19** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **Radix UI** for component primitives
- **Jotai** for state management
- **Vitest** for testing

### Existing Components Structure
```
eddi-chatbot-web/src/
├── components/
│   ├── ChatInterface/     # Main chat UI
│   ├── MessageList/       # Message display
│   └── InputBox/          # Message input
├── store/                 # Jotai state atoms
├── api/                   # API client functions
└── types/                 # TypeScript definitions
```

## New Architecture: Conversation-Centric UI

### Updated Component Hierarchy
```
App
├── AuthProvider           # User authentication context
├── ConversationProvider   # Conversation state management
└── MainLayout
    ├── Sidebar
    │   ├── UserProfile
    │   ├── ConversationList
    │   └── NewConversationButton
    └── ChatArea
        ├── ConversationHeader
        ├── MessageList (enhanced)
        └── MessageInput (enhanced)
```

## State Management with Jotai

### Core Atoms

#### User State
```typescript
// src/store/user.ts
import { atom } from 'jotai';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
  };
  last_active_at: string;
}

export const userAtom = atom<User | null>(null);
export const userLoadingAtom = atom<boolean>(false);
export const userErrorAtom = atom<string | null>(null);
```

#### Conversation State
```typescript
// src/store/conversations.ts
import { atom } from 'jotai';

export interface Conversation {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  topic: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  last_message_preview?: string;
}

export const conversationsAtom = atom<Conversation[]>([]);
export const currentConversationIdAtom = atom<string | null>(null);
export const conversationLoadingAtom = atom<boolean>(false);

// Derived atoms
export const currentConversationAtom = atom((get) => {
  const conversations = get(conversationsAtom);
  const currentId = get(currentConversationIdAtom);
  return conversations.find(c => c.id === currentId) || null;
});
```

#### Message State
```typescript
// src/store/messages.ts
import { atom } from 'jotai';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  buttons?: Array<{
    title: string;
    payload: string;
  }>;
  custom_data?: Record<string, any>;
  created_at: string;
}

// Messages per conversation
export const messagesAtom = atom<Record<string, Message[]>>({});
export const messageLoadingAtom = atom<boolean>(false);

// Current conversation messages
export const currentMessagesAtom = atom((get) => {
  const messages = get(messagesAtom);
  const currentConversationId = get(currentConversationIdAtom);
  return currentConversationId ? messages[currentConversationId] || [] : [];
});
```

## Component Implementation

### 1. Conversation List Component

```tsx
// src/components/ConversationList/ConversationList.tsx
import React from 'react';
import { useAtom } from 'jotai';
import { conversationsAtom, currentConversationIdAtom } from '@/store/conversations';
import { ConversationItem } from './ConversationItem';
import { NewConversationButton } from './NewConversationButton';

interface ConversationListProps {
  className?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ className }) => {
  const [conversations] = useAtom(conversationsAtom);
  const [currentConversationId, setCurrentConversationId] = useAtom(currentConversationIdAtom);

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  return (
    <div className={`conversation-list ${className}`}>
      <div className="p-4 border-b">
        <NewConversationButton />
      </div>
      
      <div className="overflow-y-auto flex-1">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === currentConversationId}
            onClick={() => handleConversationSelect(conversation.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

### 2. Conversation Item Component

```tsx
// src/components/ConversationList/ConversationItem.tsx
import React from 'react';
import { Conversation } from '@/store/conversations';
import { formatDistanceToNow } from 'date-fns';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick
}) => {
  return (
    <div
      className={`
        p-4 cursor-pointer border-b hover:bg-gray-50 transition-colors
        ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-medium text-sm truncate pr-2">
          {conversation.title}
        </h3>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
        </span>
      </div>
      
      {conversation.last_message_preview && (
        <p className="text-xs text-gray-600 truncate">
          {conversation.last_message_preview}
        </p>
      )}
      
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {conversation.topic.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-500">
          {conversation.message_count} messages
        </span>
      </div>
    </div>
  );
};
```

### 3. Enhanced Message List

```tsx
// src/components/MessageList/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { currentMessagesAtom, messageLoadingAtom } from '@/store/messages';
import { MessageItem } from './MessageItem';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const MessageList: React.FC = () => {
  const [messages] = useAtom(currentMessagesAtom);
  const [isLoading] = useAtom(messageLoadingAtom);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {isLoading && (
        <div className="flex justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};
```

### 4. Enhanced Message Input

```tsx
// src/components/MessageInput/MessageInput.tsx
import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { currentConversationIdAtom } from '@/store/conversations';
import { sendMessage } from '@/api/messages';
import { Button } from '@/components/ui/Button';

export const MessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId] = useAtom(currentConversationIdAtom);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !currentConversationId || isLoading) return;

    setIsLoading(true);
    try {
      await sendMessage(currentConversationId, message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={currentConversationId ? "Type your message..." : "Select a conversation to start chatting"}
          disabled={!currentConversationId || isLoading}
          className="flex-1 resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={1}
          style={{ maxHeight: '120px' }}
        />
        
        <Button
          type="submit"
          disabled={!message.trim() || !currentConversationId || isLoading}
          className="px-6"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </form>
  );
};
```

## API Integration

### API Client Functions

```typescript
// src/api/conversations.ts
import { apiClient } from './client';
import { Conversation } from '@/store/conversations';

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await apiClient.get('/api/v1/conversations');
  return response.data.conversations;
};

export const createConversation = async (title: string, initialMessage?: string): Promise<Conversation> => {
  const response = await apiClient.post('/api/v1/conversations', {
    title,
    initial_message: initialMessage
  });
  return response.data.conversation;
};

export const updateConversation = async (id: string, updates: Partial<Conversation>): Promise<Conversation> => {
  const response = await apiClient.put(`/api/v1/conversations/${id}`, updates);
  return response.data;
};

export const deleteConversation = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/conversations/${id}`);
};
```

```typescript
// src/api/messages.ts
import { apiClient } from './client';
import { Message } from '@/store/messages';

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const response = await apiClient.get(`/api/v1/conversations/${conversationId}/messages`);
  return response.data.messages;
};

export const sendMessage = async (conversationId: string, content: string): Promise<{
  user_message: Message;
  assistant_response: Message;
}> => {
  const response = await apiClient.post(`/api/v1/conversations/${conversationId}/messages`, {
    content
  });
  return response.data;
};
```

## Real-time Updates

### WebSocket Integration

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { messagesAtom } from '@/store/messages';
import { currentConversationIdAtom } from '@/store/conversations';

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null);
  const [, setMessages] = useAtom(messagesAtom);
  const [currentConversationId] = useAtom(currentConversationIdAtom);

  useEffect(() => {
    if (!currentConversationId) return;

    // Connect to WebSocket for current conversation
    ws.current = new WebSocket(`ws://localhost:8000/ws/conversations/${currentConversationId}`);
    
    ws.current.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      if (update.type === 'new_message') {
        setMessages(prev => ({
          ...prev,
          [currentConversationId]: [
            ...(prev[currentConversationId] || []),
            update.message
          ]
        }));
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [currentConversationId, setMessages]);
};
```

## Layout and Navigation

### Main Layout Component

```tsx
// src/components/Layout/MainLayout.tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { useWebSocket } from '@/hooks/useWebSocket';

export const MainLayout: React.FC = () => {
  useWebSocket(); // Enable real-time updates

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar className="w-80 bg-white border-r" />
      <ChatArea className="flex-1" />
    </div>
  );
};
```

### Responsive Design

```tsx
// src/components/Layout/ResponsiveLayout.tsx
import React, { useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export const ResponsiveLayout: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed left-0 top-0 h-full z-20' : 'relative'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        transition-transform duration-300 ease-in-out
        w-80 bg-white border-r
      `}>
        <Sidebar />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {isMobile && (
          <div className="p-4 border-b bg-white">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              ☰ Conversations
            </button>
          </div>
        )}
        <ChatArea />
      </div>
    </div>
  );
};
```

## Testing Strategy

### Component Testing

```typescript
// src/components/ConversationList/ConversationList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'jotai';
import { ConversationList } from './ConversationList';
import { conversationsAtom } from '@/store/conversations';

const mockConversations = [
  {
    id: '1',
    title: 'Database Setup',
    status: 'active' as const,
    topic: 'database_setup',
    message_count: 5,
    last_message_at: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T10:00:00Z'
  }
];

describe('ConversationList', () => {
  it('renders conversation items', () => {
    render(
      <Provider initialValues={[[conversationsAtom, mockConversations]]}>
        <ConversationList />
      </Provider>
    );

    expect(screen.getByText('Database Setup')).toBeInTheDocument();
  });

  it('handles conversation selection', () => {
    const onSelect = jest.fn();
    render(
      <Provider initialValues={[[conversationsAtom, mockConversations]]}>
        <ConversationList />
      </Provider>
    );

    fireEvent.click(screen.getByText('Database Setup'));
    // Verify selection logic
  });
});
```

### Integration Testing

```typescript
// src/integration/conversation-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '@/App';
import { server } from '@/mocks/server';

describe('Conversation Flow', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('creates new conversation and sends message', async () => {
    render(<App />);

    // Click new conversation
    fireEvent.click(screen.getByText('New Conversation'));

    // Type initial message
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Help me set up PostgreSQL' } });
    fireEvent.click(screen.getByText('Send'));

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText(/I'll help you set up PostgreSQL/)).toBeInTheDocument();
    });
  });
});
```

## Performance Optimizations

### Virtual Scrolling for Long Conversations

```tsx
// src/components/MessageList/VirtualizedMessageList.tsx
import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAtom } from 'jotai';
import { currentMessagesAtom } from '@/store/messages';

const MessageRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
  const [messages] = useAtom(currentMessagesAtom);
  const message = messages[index];

  return (
    <div style={style}>
      <MessageItem message={message} />
    </div>
  );
};

export const VirtualizedMessageList: React.FC = () => {
  const [messages] = useAtom(currentMessagesAtom);

  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={80}
      className="flex-1"
    >
      {MessageRow}
    </List>
  );
};
```

### Lazy Loading and Pagination

```typescript
// src/hooks/useMessages.ts
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { messagesAtom, messageLoadingAtom } from '@/store/messages';
import { getMessages } from '@/api/messages';

export const useMessages = (conversationId: string) => {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [isLoading, setIsLoading] = useAtom(messageLoadingAtom);

  useEffect(() => {
    if (!conversationId || messages[conversationId]) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const conversationMessages = await getMessages(conversationId);
        setMessages(prev => ({
          ...prev,
          [conversationId]: conversationMessages
        }));
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId, messages, setMessages, setIsLoading]);

  return {
    messages: messages[conversationId] || [],
    isLoading
  };
};
```

## Migration from Current Implementation

### Step 1: Add New State Management
- Install and configure Jotai atoms
- Create conversation and message stores
- Implement API client functions

### Step 2: Update Existing Components
- Enhance existing ChatInterface to support conversations
- Add conversation list sidebar
- Update message handling logic

### Step 3: Gradual Feature Rollout
- Feature flag for new conversation UI
- A/B test between old and new interface
- Monitor user adoption and feedback

### Step 4: Complete Migration
- Remove legacy state management
- Clean up unused components
- Update all API calls to new endpoints

This frontend integration provides a comprehensive foundation for the user conversation management system while maintaining excellent user experience and performance.