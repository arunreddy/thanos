import React, { useState } from 'react';
import { Conversation } from '@/types';
import { useConversations } from '@/hooks/useConversations';
import { useConversationContext } from '@/contexts/ConversationContext';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/AppContext';
import { useToast } from '@/components/ui/Toast';

interface ConversationListProps {
  onConversationSelect?: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onConversationSelect,
  selectedConversationId,
}) => {
  const { isAuthenticated } = useAppContext();
  const { currentConversationId } = useConversationContext();
  const { conversations, loading, error, createConversation } = useConversations();
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  // Use selectedConversationId prop or fall back to context
  const activeConversationId = selectedConversationId || currentConversationId;

  const handleCreateConversation = async () => {
    setIsCreating(true);
    try {
      const newConversation = await createConversation('New Conversation', 'general');
      if (onConversationSelect) {
        onConversationSelect(newConversation);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
      showToast('Failed to create new conversation', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please log in to view your conversations
      </div>
    );
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>Failed to load conversations</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Conversation Button */}
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={handleCreateConversation}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Creating...' : '+ New Conversation'}
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Create your first conversation to get started!</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === activeConversationId}
                onClick={() => onConversationSelect?.(conversation)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
}) => {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div
      className={`
        p-3 rounded-lg cursor-pointer transition-colors border-l-4
        ${
          isSelected
            ? 'bg-blue-50 border-l-blue-500 shadow-sm'
            : 'bg-white border-l-transparent hover:bg-gray-50'
        }
      `}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-medium text-sm text-gray-900 line-clamp-1">
          {conversation.title}
        </h3>
        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
          {formatTimeAgo(conversation.last_message_at)}
        </span>
      </div>

      {conversation.last_message_preview && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
          {conversation.last_message_preview}
        </p>
      )}

      <div className="flex justify-between items-center">
        {conversation.topic && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
            {conversation.topic.replace('_', ' ')}
          </span>
        )}
        <span className="text-xs text-gray-500">
          {conversation.message_count} messages
        </span>
      </div>
    </div>
  );
};