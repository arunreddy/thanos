import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Conversation } from '@/types';

interface ConversationContextType {
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  currentConversationId: string | null;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

interface ConversationProviderProps {
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  const currentConversationId = currentConversation?.id || null;

  const contextValue: ConversationContextType = {
    currentConversation,
    setCurrentConversation,
    currentConversationId,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
};