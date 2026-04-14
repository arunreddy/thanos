import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import ChatContent from './chat/content';
import SideNav from './chat/sidenav';
import ContextPanel, { ContextPanelData } from './chat/ContextPanel';
import { useChat } from '../hooks/useChat';
import { ChatThemeProvider } from '../contexts/ChatThemeContext';

export default function Chat() {
  const { chatId } = useParams();
  const { currentChatId, setCurrentChatId } = useChat();
  const [contextPanel, setContextPanel] = useState<ContextPanelData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Clear context panel when conversation changes
  const activeChatId = chatId || currentChatId;
  useEffect(() => {
    setContextPanel(null);
  }, [activeChatId]);

  // Wrap setCurrentChatId so creating a new conversation also refreshes the sidenav
  const handleSetActiveChatId = (id: string | null, isFirstMessage?: boolean) => {
    setCurrentChatId(id);
    if (isFirstMessage) {
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  return (
    <ChatThemeProvider>
    <div className="bg-background text-foreground w-full h-screen flex overflow-hidden">
      <SideNav
        data-testid="sidenav"
        activeChatId={chatId || currentChatId || 'unknown'}
        onSelectChat={setCurrentChatId}
        refreshTrigger={refreshTrigger}
      />

      {/* Chat panel — smoothly shares space with results panel */}
      <motion.div
        className="h-full overflow-hidden"
        animate={{
          flex: contextPanel ? '1 1 50%' : '1 1 100%',
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          borderRight: contextPanel ? '1px solid #E9ECEF' : undefined,
          minWidth: contextPanel ? 480 : 0,
        }}
      >
        <ChatContent
          data-testid="chat-content"
          chatId={chatId || currentChatId || 'unknown'}
          setActiveChatId={handleSetActiveChatId}
          onShowContext={setContextPanel}
        />
      </motion.div>

      {/* Results panel — always-visible when context is set */}
      <AnimatePresence mode="wait">
        {contextPanel && (
          <motion.div
            key="context-panel"
            className="h-full min-w-0"
            style={{ flex: '1 1 50%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ContextPanel
              context={contextPanel}
              onClose={() => setContextPanel(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ChatThemeProvider>
  );
}
