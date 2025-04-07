import { useEffect, useState, useRef } from "react";
import { getConversation, sendMessage } from "../../../lib/api";
import ChatMessage from "../ChatMessage";
import ChatInput from "../ChatInput";
import TopNav from "../topnav";

interface ChatContentProps {
  chatId: string | null;
  setActiveChatId: (id: string) => void;
}

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  timestamp?: string;
  buttons?: any;
}

const ChatContent: React.FC<ChatContentProps> = ({
  chatId,
  setActiveChatId,
}) => {
  // const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing conversation if conversationId is provided
  useEffect(() => {
    if (chatId) {
      const fetchConversation = async () => {
        try {
          setIsLoading(true);
          const response = await getConversation(chatId);

          console.log(response);

          // setChat(response);
          setMessages(response.messages || []);
          setError(null);
        } catch (err) {
          setError("Failed to load conversation");
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchConversation();
    } else {
      // Clear messages for new conversation
      setMessages([]);
    }
  }, [chatId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    console.log("Sending message:", content);
    // Optimistically add user message to UI
    const userMessage: Message = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Clear any previous errors
    setError(null);
    setIsLoading(true);

    try {
      // Send message to API with conversation_id if available
      const response = await sendMessage({
        conversation_id: chatId ? Number(chatId) : null,
        message: content,
      });

      // Add bot response to messages
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: response.message.role,
          content: response.message.content,
          buttons: response.message.buttons,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Update chatId if this is a new conversation
      if (!chatId && response.conversation_id) {
        setActiveChatId(response.conversation_id);
      }
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle button clicks from any message
  const handleButtonClick = async (payload: string) => {
    // Extract the actual message from the payload if needed
    // For Rasa, payloads look like "/intent{\"entity\": \"value\"}"
    // We'll extract just the intent part for display in the UI
    // const displayMessage = payload.split("{")[0].replace("/", "");

    // Call the same message handler but with the payload
    await handleSendMessage(payload);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <TopNav title={chatId ? `${chatId} Conversation` : "New Chat"} />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-background container mx-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Start a new conversation
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp || message.created_at}
              buttons={message.buttons}
              onButtonClick={handleButtonClick}
            />
          ))
        )}

        {isLoading && (
          <div className="flex gap-1 justify-center my-4 text-muted-foreground">
            Loading
            <div className="animate-bounce">...</div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-center my-2 text-sm">{error}</div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-border p-4 bg-background">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatContent;
