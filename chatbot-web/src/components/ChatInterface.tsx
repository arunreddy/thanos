// src/components/ChatInterface.tsx (updated)
'use client';

import { useState, useEffect, useRef } from 'react';
import { sendMessage, getConversation } from '@/lib/api';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';

interface Button {
  title: string;
  payload: string;
}

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  timestamp?: string;
  buttons?: Button[];
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onNewConversation?: (id: string) => void;
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
          const conversation = await getConversation(Number(conversationId));
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

    console.log('Sending message:', content);
    // Optimistically add user message to UI
    const userMessage: Message = { role: 'user', content, timestamp: new Date().toISOString() };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // Clear any previous errors
    setError(null);
    setIsLoading(true);

    try {
      // Send message to API with conversation_id if available
      const response = await sendMessage({
        conversation_id: conversationId ? Number(conversationId) : null,
        message: content
      });

      // Add bot response to messages
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: response.message.role,
          content: response.message.content,
          buttons: response.message.buttons,
          timestamp: new Date().toISOString()
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

  // Handle button clicks from any message
  const handleButtonClick = async (payload: string) => {
    // Extract the actual message from the payload if needed
    // For Rasa, payloads look like "/intent{\"entity\": \"value\"}"
    // We'll extract just the intent part for display in the UI
    const displayMessage = payload.split('{')[0].replace('/', '');
    
    // Call the same message handler but with the payload
    await handleSendMessage(payload);
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
              timestamp={message.timestamp || message.created_at}
              buttons={message.buttons}
              onButtonClick={handleButtonClick}
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