import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import ChatContent from './chat/content';
import SideNav from './chat/sidenav';
import ContextPanel, { ContextPanelData } from './chat/ContextPanel';
import { useChat } from '../hooks/useChat';

export default function Chat() {
  const { chatId } = useParams();
  const { currentChatId, setCurrentChatId } = useChat();
  const [contextPanel, setContextPanel] = useState<ContextPanelData | null>(null);

  // Clear context panel when conversation changes
  const activeChatId = chatId || currentChatId;
  useEffect(() => {
    setContextPanel(null);
  }, [activeChatId]);

  return (
    <div className="bg-background text-foreground w-full h-[100vh] flex overflow-hidden">
      <SideNav
        data-testid="sidenav"
        activeChatId={chatId || currentChatId || 'unknown'}
        onSelectChat={setCurrentChatId}
      />

      {/* Chat panel — animates width */}
      <motion.div
        className="h-full overflow-hidden"
        animate={{
          flex: contextPanel ? '0 0 420px' : '1 1 0%',
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          borderRight: contextPanel ? '1px solid #E9ECEF' : undefined,
          minWidth: 0,
        }}
      >
        <ChatContent
          data-testid="chat-content"
          chatId={chatId || currentChatId || 'unknown'}
          setActiveChatId={setCurrentChatId}
          onShowContext={setContextPanel}
        />
      </motion.div>

      {/* Context panel — slides in */}
      <AnimatePresence mode="wait">
        {contextPanel && (
          <motion.div
            key="context-panel"
            className="h-full flex-1 min-w-0"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <ContextPanel
              context={contextPanel}
              onClose={() => setContextPanel(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
