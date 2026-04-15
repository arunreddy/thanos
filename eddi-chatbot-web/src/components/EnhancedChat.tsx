import React, { useEffect, useState, useRef } from 'react';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useConversation, useSendMessage, useNewConversation } from '@/hooks/useConversationsQuery';
import ChatMessage from './chat/ChatMessage';
import ChatInput, { ChatInputRef } from './chat/ChatInput';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useAppContext } from '@/AppContext';
import { useToast } from '@/components/ui/Toast';
import { RasaStatusDot } from './StatusIndicator';

interface ConversationMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  timestamp?: string;
  buttons?: unknown;
  custom_data?: unknown;
}

enum ChatState {
  IDLE = 'idle',
  LOADING_CONVERSATION = 'loading_conversation',
  SENDING_MESSAGE = 'sending_message',
}

export const EnhancedChat: React.FC = () => {
  const { currentConversation, setCurrentConversation } = useConversationContext();
  const { isAuthenticated } = useAppContext();
  const [chatState, setChatState] = useState<ChatState>(ChatState.IDLE);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  const { showToast } = useToast();

  // TanStack Query hooks
  const { 
    data: conversationData, 
    isLoading: isLoadingConversation, 
    error: conversationError 
  } = useConversation(currentConversation?.id || null);
  
  const sendMessageMutation = useSendMessage();
  const newConversationMutation = useNewConversation();

  // Extract messages from conversation data
  const messages: ConversationMessage[] = conversationData?.messages || [];

  // Update chat state based on TanStack Query states
  useEffect(() => {
    if (isLoadingConversation) {
      setChatState(ChatState.LOADING_CONVERSATION);
      setHasInteracted(false);
    } else {
      setChatState(ChatState.IDLE);
      if (messages.length > 0) {
        setHasInteracted(true);
      }
    }
  }, [isLoadingConversation, messages.length]);

  // Handle conversation errors
  useEffect(() => {
    if (conversationError) {
      showToast(`Failed to load conversation: ${conversationError.message}`, 'error');
    }
  }, [conversationError, showToast]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setChatState(ChatState.SENDING_MESSAGE);
    setHasInteracted(true);

    try {
      if (currentConversation?.id) {
        // Send to existing conversation
        await sendMessageMutation.mutateAsync({
          conversation_id: currentConversation.id,
          message: content.trim(),
        });
      } else {
        // Create new conversation
        const response = await newConversationMutation.mutateAsync({
          message: content.trim(),
        });
        
        // Update current conversation context
        if (response.conversation_id) {
          setCurrentConversation({
            id: response.conversation_id,
            title: content.trim().substring(0, 50) + (content.length > 50 ? '...' : ''),
            status: 'active',
            message_count: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          });
        }
      }
      
      // Clear input on success
      if (chatInputRef.current && 'clearInput' in chatInputRef.current) {
        (chatInputRef.current as unknown as { clearInput: () => void }).clearInput();
      }
      
    } catch (err) {
      console.error('Failed to send message:', err);
      // Error handling is done by the mutation hooks via toast notifications
    } finally {
      setChatState(ChatState.IDLE);
    }
  };

  const isLoading = chatState === ChatState.LOADING_CONVERSATION || chatState === ChatState.SENDING_MESSAGE || sendMessageMutation.isPending || newConversationMutation.isPending;

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Database Observability Chat</h2>
          <p className="text-gray-600">Please log in to start chatting with your database assistant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      {currentConversation && (
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {currentConversation.title}
              </h1>
              {currentConversation.topic && (
                <p className="text-sm text-gray-600">
                  {currentConversation.topic.replace('_', ' ')}
                </p>
              )}
            </div>
            <RasaStatusDot className="ml-4" />
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {!currentConversation ? (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Conversation</h2>
              <p className="text-gray-600">Choose a conversation from the sidebar or create a new one to get started.</p>
            </div>
          </div>
        ) : chatState === ChatState.LOADING_CONVERSATION ? (
          // Loading conversation
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading conversation...</p>
            </div>
          </div>
        ) : conversationError ? (
          // Error state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-2">Error loading conversation</p>
              <p className="text-sm text-gray-500">{conversationError.message}</p>
            </div>
          </div>
        ) : (
          // Messages
          <div className="px-6 py-4 space-y-4">
            {!hasInteracted && messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
                <p className="text-gray-600">Ask me anything about your database!</p>
              </div>
            )}

            <AnimatePresence>
              {messages.map((message: ConversationMessage, index: number) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatMessage 
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp || message.created_at}
                    buttons={message.buttons as Array<{ title: string; payload: string }> | undefined}
                    customForm={message.custom_data as import('@/types').CustomForm | undefined}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {chatState === ChatState.SENDING_MESSAGE && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 text-gray-500"
              >
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Assistant is thinking...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <ChatInput
          ref={chatInputRef}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};