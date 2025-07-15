import React from 'react';
import { ConversationList } from './ConversationList';
import { useConversationContext } from '@/contexts/ConversationContext';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/types';
import { RasaStatusDot } from './StatusIndicator';

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isOpen,
  onToggle,
  className = '',
}) => {
  const { setCurrentConversation } = useConversationContext();

  const handleConversationSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative top-0 left-0 h-full z-50
          bg-white border-r border-gray-200 shadow-lg md:shadow-none
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-80 flex flex-col
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            <RasaStatusDot />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="md:hidden"
          >
            ✕
          </Button>
        </div>

        {/* Conversation List */}
        <ConversationList onConversationSelect={handleConversationSelect} />
      </div>
    </>
  );
};