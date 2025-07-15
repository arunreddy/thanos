import React, { useState } from 'react';
import { ConversationSidebar } from './ConversationSidebar';
import { ConversationProvider } from '@/contexts/ConversationContext';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from './ui/ErrorBoundary';

interface ChatLayoutWithSidebarProps {
  children: React.ReactNode;
}

export const ChatLayoutWithSidebar: React.FC<ChatLayoutWithSidebarProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ErrorBoundary>
      <ConversationProvider>
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar */}
          <ErrorBoundary fallback={
            <div className="w-80 bg-white border-r border-gray-200 p-4 text-center">
              <p className="text-red-500">Sidebar error</p>
            </div>
          }>
            <ConversationSidebar
              isOpen={sidebarOpen}
              onToggle={toggleSidebar}
              className="md:block"
            />
          </ErrorBoundary>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="flex items-center gap-2"
                >
                  <span className="text-lg">☰</span>
                  <span>Conversations</span>
                </Button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </ConversationProvider>
    </ErrorBoundary>
  );
};