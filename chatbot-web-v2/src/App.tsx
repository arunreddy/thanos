import { useState, useRef } from "react";
import ChatContent from "./components/chat/content/index.tsx";
import SideNav from "./components/chat/sidenav/index.tsx";

function App() {
  // Use refs to store the actual chat ID and state
  const chatIdRef = useRef<string | null>(null);
  const isNewChatRef = useRef<boolean>(true);

  // State variables only used for forcing re-renders when needed
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState<boolean>(true);

  // Flag to track if we're updating after first message
  const isFirstMessageUpdateRef = useRef<boolean>(false);

  // Handle setting active chat ID without causing unnecessary reloads
  const handleSetActiveChatId = (
    id: string | null,
    isFirstMessage: boolean = false
  ) => {
    // Always update the refs
    chatIdRef.current = id;

    // Set the first message update flag
    isFirstMessageUpdateRef.current = isFirstMessage;

    if (id === null) {
      // Starting a new chat
      isNewChatRef.current = true;
      setIsNewChat(true);
    } else if (!isFirstMessage) {
      // Only update the state for non-first-message updates
      // This prevents the reload after first message
      isNewChatRef.current = false;
      setIsNewChat(false);
    }

    // Only update the state if this is not a first message update
    // This prevents the reload after first message
    if (!isFirstMessage) {
      setActiveChatId(id);
    }
  };

  return (
    <div className="bg-background text-foreground w-full h-[100vh] flex divide-x divide-border">
      <SideNav
        activeChatId={activeChatId}
        onSelectChat={handleSetActiveChatId}
        onNewChat={() => handleSetActiveChatId(null)}
      />

      <ChatContent
        chatId={activeChatId}
        setActiveChatId={handleSetActiveChatId}
        isNewChat={isNewChat}
      />
    </div>
  );
}

export default App;
