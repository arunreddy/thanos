// frontend/src/components/ChatInterface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { sendMessage, getConversation } from '@/lib/api';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatInterfaceProps {
  conversationId: number | null;
  onNewConversation?: (id: number) => void;
}

export default function ChatInterface({ conversationId, onNewConversation }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing conversation if conversationId is provided
  useEffect(() => {
    if (conversationId) {
      const fetchConversation = async () => {
        try {
          setIsLoading(true);
          const conversation = await getConversation(conversationId);
          setMessages(conversation.messages || []);
          setError(null);
        } catch (err) {
          setError('Failed to load conversation');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchConversation();
    } else {
      // Clear messages for new conversation
      setMessages([]);
    }
  }, [conversationId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Optimistically add user message to UI
    const userMessage: Message = { role: 'user', content };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // Clear any previous errors
    setError(null);
    setIsLoading(true);

    try {
      // Send message to API
      const response = await sendMessage({
        conversation_id: conversationId,
        message: content
      });

      // Add bot response to messages
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: response.message.role,
          content: response.message.content
        }
      ]);
      
      // Update conversationId if this is a new conversation
      if (!conversationId && response.conversation_id && onNewConversation) {
        onNewConversation(response.conversation_id);
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold">
          {conversationId ? 'Conversation' : 'New Chat'}
        </h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Start a new conversation
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
              timestamp={message.created_at}
            />
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-center my-4">
            <div className="animate-bounce text-blue-500">...</div>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-center my-2 text-sm">{error}</div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}