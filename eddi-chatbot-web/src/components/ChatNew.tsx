import { useState } from 'react';
import { useParams } from 'react-router';
import SideNav from './chat/sidenav';
import { useChat } from '../hooks/useChat';
import { HelpCircle, Loader2, MessageCircle } from 'lucide-react';
import { newConversation } from '@/lib/api';
import { useNavigate } from 'react-router';

export default function ChatNew() {
  const { chatId } = useParams();
  const { currentChatId, setCurrentChatId } = useChat();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const onSendMessage = async (message: string) => {
    setIsLoading(true);
    const response = await newConversation({ message });
    if (response.conversation_id) {
      navigate(`/chat/${response.conversation_id}`);
    }
    setIsLoading(false);
  }


  return (
    <div className="bg-background text-foreground w-full h-[100vh] flex divide-x divide-border">
      <SideNav
        activeChatId={chatId || currentChatId}
        onSelectChat={setCurrentChatId}
      />
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl w-full p-6">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold flex items-center gap-2 justify-center">
                <img src="/citizens-logo.png" alt="EDDI Assistant" className="w-6 h-6" /> 
                {new Date().getHours() < 12 
                  ? "Hello, good morning" 
                  : new Date().getHours() < 18 
                    ? "Hello, good afternoon" 
                    : "Hello, good evening"}
              </h2>
            </div>
            
            <div className="w-full">
              <div className="relative w-full">
                <textarea 
                  className="w-full p-3 pr-12 rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="How can I help you today?"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {isLoading ? (
                  <div className="absolute right-2 bottom-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <button 
                  className={`absolute right-2 bottom-4 p-2 rounded-full transition-colors cursor-pointer ${
                    message.trim() 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  onClick={() => onSendMessage(message)}
                  disabled={!message.trim()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                  </svg>
                </button>
                )}
              </div>
              <div className="flex justify-center mt-4 gap-2">
                <a href="/help" className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">
                  <HelpCircle className="inline-block mr-1 w-4 h-4" />
                  Help
                </a>
                <a href="/support" className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">
                  <MessageCircle className="inline-block mr-1 w-4 h-4" />
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}