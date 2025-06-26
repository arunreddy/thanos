import { useParams } from 'react-router';
import ChatContent from './chat/content';
import SideNav from './chat/sidenav';
import { useChat } from '../hooks/useChat';

export default function Chat() {
  const { chatId } = useParams();
  const { currentChatId, setCurrentChatId } = useChat();

  return (
    <div className="bg-background text-foreground w-full h-[100vh] flex divide-x divide-border">
      <SideNav
        activeChatId={chatId || currentChatId}
        onSelectChat={setCurrentChatId}
      />
      <ChatContent
        chatId={chatId || currentChatId}
        setActiveChatId={setCurrentChatId}
        isNewChat={!chatId}
      />
    </div>
  );
} 