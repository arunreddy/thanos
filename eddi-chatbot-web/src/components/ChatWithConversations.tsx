import React from 'react';
import { ChatLayoutWithSidebar } from './ChatLayoutWithSidebar';
import { EnhancedChat } from './EnhancedChat';

export const ChatWithConversations: React.FC = () => {
  return (
    <ChatLayoutWithSidebar>
      <EnhancedChat />
    </ChatLayoutWithSidebar>
  );
};