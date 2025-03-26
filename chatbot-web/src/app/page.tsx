'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ConversationsList from '@/components/ConversationsList';

export default function Home() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <ConversationsList 
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onNewConversation={() => setActiveConversationId(null)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <ChatInterface conversationId={activeConversationId} />
      </div>
    </div>
  );

}