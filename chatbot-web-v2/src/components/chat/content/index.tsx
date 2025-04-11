import { useEffect, useState, useRef } from "react";
import { getConversation, sendMessage } from "../../../lib/api";
import ChatMessage from "../ChatMessage";
import ChatInput from "../ChatInput";
import TopNav from "../topnav";
import { AnimatePresence, motion } from "framer-motion";
import { Bot } from "lucide-react";

interface ChatContentProps {
  chatId: string | null;
  setActiveChatId: (id: string | null, isFirstMessage?: boolean) => void;
  isNewChat: boolean;
}

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  timestamp?: string;
  buttons?: any;
}

enum ChatState {
  IDLE = "idle",
  LOADING_CONVERSATION = "loading_conversation",
  SENDING_MESSAGE = "sending_message",
}

const ChatContent: React.FC<ChatContentProps> = ({
  chatId,
  setActiveChatId,
  isNewChat,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>(ChatState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const welcomeMessageContent =
    'Welcome to the Database Management Assistant! 👋\n\nI can help you with the following services:\n\n1. Schema Explorer – Explore database schema details.\n2. Database Inference – Get insights and recommendations for your database.\n3. Query Performance Explorer – Optimize SQL query performance.\n4. Database Resource Management – Monitor and manage database resources.\n\nTo select a service, please type the service name or number.\nFor help, type "/help" or "/help <service_name>"';

  // This effect handles loading conversations when chatId changes
  useEffect(() => {
    setHasInteracted(false);

    if (chatId) {
      setChatState(ChatState.LOADING_CONVERSATION);
      setMessages([]);

      const fetchConversation = async () => {
        try {
          const response = await getConversation(chatId);

          const conversationMessages = response.messages || [];
          const hasWelcomeMessage = conversationMessages.some(
            (msg: Message) =>
              msg.role === "assistant" &&
              msg.content.includes(
                "Welcome to the Database Management Assistant"
              )
          );

          // Always add welcome message if it doesn't exist, even for empty conversations
          if (!hasWelcomeMessage) {
            const welcomeMessage: Message = {
              id: Date.now() - 1000,
              role: "assistant",
              content: welcomeMessageContent,
              timestamp: new Date(Date.now() - 1000).toISOString(),
            };
            setMessages([welcomeMessage, ...conversationMessages]);
          } else {
            setMessages(conversationMessages);
          }
        } catch (err) {
          setError("Failed to load conversation");
          console.error(err);
        } finally {
          setChatState(ChatState.IDLE);
        }
      };

      fetchConversation();
    } else {
      setChatState(ChatState.IDLE);
      const welcomeMessage: Message = {
        id: Date.now(),
        role: "assistant",
        content: welcomeMessageContent,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, [chatId, isNewChat]);

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setHasInteracted(true);

    // Check if the content is a number that could match an option
    const lastMessage = messages[messages.length - 1];
    const isNumberOption = /^\d+$/.test(content.trim());
    
    let processedContent = content;
    
    // If the last message had buttons and user entered a number
    if (lastMessage?.buttons?.length > 0 && isNumberOption) {
      const optionIndex = parseInt(content.trim()) - 1;
      if (optionIndex >= 0 && optionIndex < lastMessage.buttons.length) {
        // Use the payload from the corresponding button
        processedContent = lastMessage.buttons[optionIndex].payload;
      }
    }

    const messageId = Date.now();

    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: processedContent, // Use the processed content but display what the user typed
      timestamp: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    setChatState(ChatState.SENDING_MESSAGE);
    setError(null);

    try {
      const response = await sendMessage({
        conversation_id: chatId ? Number(chatId) : null,
        message: processedContent, // Send the processed content to the API
      });

      const botMessage: Message = {
        id: messageId + 1,
        role: response.message.role,
        content: response.message.content,
        buttons: response.message.buttons,
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      if (!chatId && response.conversation_id) {
        // Pass true as the second argument to indicate this is a first message update
        // This prevents the App component from triggering a re-render
        setActiveChatId(response.conversation_id, true);
      }
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.error(err);
    } finally {
      setChatState(ChatState.IDLE);
    }
  };

  const handleButtonClick = async (payload: string) => {
    await handleSendMessage(payload);
  };

  const TypingIndicator = () => (
    <motion.div
      className="flex mb-4 items-start gap-2 justify-start"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-6 h-6 mt-2 text-muted-foreground flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Bot className="w-5 h-5" />
      </motion.div>
      <motion.div
        className="max-w-[80%] rounded-lg px-4 py-3 bg-background border border-border rounded-bl-none"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          mass: 1,
        }}
      >
        <div className="flex space-x-2 items-center h-5">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{ y: [0, -5, 0] }}
              transition={{
                repeat: Infinity,
                duration: 0.6,
                ease: "easeInOut",
                delay,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );

  const showLoadingScreen =
    chatState === ChatState.LOADING_CONVERSATION &&
    messages.length === 0 &&
    !hasInteracted;

  const showTypingIndicator = chatState === ChatState.SENDING_MESSAGE;

  return (
    <div className="flex flex-col h-full w-full">
      <TopNav title={chatId ? `${chatId} Conversation` : "New Chat"} />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-background container mx-auto relative">
        {/* Loading screen - only shown when explicitly loading an existing conversation */}
        {showLoadingScreen && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <div className="flex items-center space-x-2">
              {[0, 300, 600].map((delay, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <div className="mt-2">Loading conversation...</div>
          </div>
        )}

        {/* Message list */}
        <div className="min-h-[50px]">
          {" "}
          {/* Minimum height to prevent layout shifts */}
          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((message, index) => (
              <ChatMessage
                key={
                  message.id ||
                  `msg-${index}-${message.timestamp || Date.now()}`
                }
                role={message.role}
                content={message.content}
                timestamp={message.timestamp || message.created_at}
                buttons={message.buttons}
                onButtonClick={handleButtonClick}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Typing indicator */}
        <AnimatePresence>
          {showTypingIndicator && <TypingIndicator />}
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <div className="text-red-500 text-center my-2 text-sm">{error}</div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-border p-4 bg-background">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={chatState !== ChatState.IDLE}
        />
      </div>
    </div>
  );
};

export default ChatContent;
