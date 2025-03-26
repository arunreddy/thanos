// frontend/src/components/ConversationsList.tsx
'use client';

import { useState, useEffect } from 'react';
import { getConversations, deleteConversation } from '@/lib/api';
import { format } from 'date-fns';

interface Conversation {
  id: number;
  title: string;
  updated_at: string;
}

interface ConversationsListProps {
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
}

export default function ConversationsList({ 
  activeConversationId, 
  onSelectConversation,
  onNewConversation
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const data = await getConversations();
        setConversations(data);
        setError(null);
      } catch (err) {
        setError('Failed to load conversations');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation
    
    try {
      await deleteConversation(id);
      
      // Remove from state
      setConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== id)
      );
      
      // If the active conversation was deleted, create a new one
      if (activeConversationId === id) {
        onNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      // Could show a toast notification here
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={onNewConversation}
        className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        New Chat
      </button>
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm text-center">{error}</div>
      ) : (
        <div className="mt-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`
                  flex justify-between items-center p-3 rounded-md cursor-pointer
                  ${activeConversationId === conv.id 
                    ? 'bg-blue-100 border-blue-300' 
                    : 'bg-white hover:bg-gray-100 border-gray-200'
                  } 
                  border
                `}
              >
                <div className="truncate flex-1">
                  <div className="font-medium text-sm">{conv.title}</div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(conv.updated_at), 'MMM d, h:mm a')}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="ml-2 text-gray-400 hover:text-red-500"
                  aria-label="Delete conversation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}