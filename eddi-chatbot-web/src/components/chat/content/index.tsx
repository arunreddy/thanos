import { useEffect, useState, useRef } from "react";
import { getConversation, sendMessage, newConversation, submitFeedback, deleteFeedback } from "../../../lib/api";
import ChatMessage from "../ChatMessage";
import ChatInput, { ChatInputRef } from "../ChatInput";
import TopNav from "../topnav";
import { AnimatePresence, motion } from "framer-motion";
import { Bot } from "lucide-react";
import { CustomForm, FeedbackType, FeedbackRequest } from "@/types";
import type { ContextPanelData } from "../ContextPanel";

interface ChatContentProps {
  chatId: string | null;
  setActiveChatId: (id: string | null, isFirstMessage?: boolean) => void;
  onShowContext?: (context: ContextPanelData) => void;
}

interface Message {
  id?: string | number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  timestamp?: string;
  buttons?: any;
  custom?: any;
}

enum ChatState {
  IDLE = "idle",
  LOADING_CONVERSATION = "loading_conversation",
  SENDING_MESSAGE = "sending_message",
}

const ChatContent: React.FC<ChatContentProps> = ({
  chatId,
  setActiveChatId,
  onShowContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>(ChatState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  const [feedbackStates, setFeedbackStates] = useState<Record<string, FeedbackType | "none">>({});

  const handleFeedbackSubmit = async (messageId: string, data: FeedbackRequest) => {
    // Optimistic update
    setFeedbackStates((prev) => ({ ...prev, [messageId]: data.feedback_type }));
    try {
      await submitFeedback(messageId, data);
    } catch (err) {
      // Revert on error
      setFeedbackStates((prev) => ({ ...prev, [messageId]: "none" }));
      console.error("Failed to submit feedback:", err);
    }
  };

  const handleFeedbackRemove = async (messageId: string) => {
    const previous = feedbackStates[messageId];
    // Optimistic update
    setFeedbackStates((prev) => ({ ...prev, [messageId]: "none" }));
    try {
      await deleteFeedback(messageId);
    } catch (err) {
      // Revert on error
      setFeedbackStates((prev) => ({ ...prev, [messageId]: previous || "none" }));
      console.error("Failed to remove feedback:", err);
    }
  };

  const handleRetry = (messageIndex: number) => {
    // Find the user message that preceded this assistant message
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        handleSendMessage(messages[i].content);
        return;
      }
    }
  };

  // This effect handles loading conversations when chatId changes
  useEffect(() => {
    setHasInteracted(false);

    if (chatId) {
      setChatState(ChatState.LOADING_CONVERSATION);
      setMessages([]);

      const fetchConversation = async () => {
        try {
          const response = await getConversation(chatId);
          const conversationMessages = (response.messages || []).map((m: any) => ({
            ...m,
            custom: m.custom || m.custom_data,
          }));
          
          // Add welcome message if no messages exist
          if (conversationMessages.length === 0) {
            const welcomeMessage: Message = {
              id: 0,
              role: "assistant",
              content: "Welcome to the Database Management Assistant! 👋\n\nI can help you with:\n• Database provisioning and management\n• Schema exploration and analysis\n• Query performance optimization\n• Database recommendations\n\nWhat would you like to do today?",
              timestamp: new Date().toISOString(),
            };
            setMessages([welcomeMessage]);
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
      // Add welcome message for new chats
      const welcomeMessage: Message = {
        id: 0,
        role: "assistant",
        content: "Welcome to the Database Management Assistant! 👋\n\nI can help you with:\n• Database provisioning and management\n• Schema exploration and analysis\n• Query performance optimization\n• Database recommendations\n\nWhat would you like to do today?",
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, [chatId]);

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
      let response;
      if (chatId) {
        response = await sendMessage({
          conversation_id: chatId,
          message: processedContent, // Send the processed content to the API
        });
      } else {
        response = await newConversation({
          message: processedContent, // Send the processed content to the API
        });
      }

      const botMessage: Message = {
        id: response.message.id || messageId + 1,
        role: response.message.role,
        content: response.message.content,
        buttons: response.message.buttons,
        timestamp: new Date().toISOString(),
        custom: response.message.custom,
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
      // Focus the input after response is received
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  };

  const handleButtonClick = async (payload: string, title?: string) => {
    // Find the button title if not provided
    let displayText = title;
    if (!displayText) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.buttons?.length > 0) {
        const button = lastMessage.buttons.find((btn: any) => btn.payload === payload);
        displayText = button?.title || payload;
      } else {
        displayText = payload;
      }
    }

    // Send the payload to the API but display the title to the user
    if (!payload.trim()) return;

    setHasInteracted(true);

    const messageId = Date.now();

    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: displayText || payload, // Display the button title
      timestamp: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    setChatState(ChatState.SENDING_MESSAGE);
    setError(null);

    try {
      let response;
      if (chatId) {
        response = await sendMessage({
          conversation_id: chatId,
          message: payload, // Send the actual payload to the API
        });
      } else {
        response = await newConversation({
          message: payload, // Send the actual payload to the API
        });
      }

      const botMessage: Message = {
        id: response.message.id || messageId + 1,
        role: response.message.role,
        content: response.message.content,
        buttons: response.message.buttons,
        timestamp: new Date().toISOString(),
        custom: response.message.custom,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      if (!chatId && response.conversation_id) {
        setActiveChatId(response.conversation_id, true);
      }
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.error(err);
    } finally {
      setChatState(ChatState.IDLE);
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
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

  // Derive conversation title from the first user message
  const firstUserMessage = messages.find(m => m.role === "user");
  const conversationTitle = firstUserMessage
    ? firstUserMessage.content.slice(0, 80) + (firstUserMessage.content.length > 80 ? "..." : "")
    : (chatId ? "Conversation" : null);

  return (
    <div className="flex flex-col h-full w-full">
      <TopNav title={conversationTitle} />

      {/* Messages area + floating input */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto p-4 pb-24 bg-background">
          <div className="max-w-3xl mx-auto">
            {/* Loading screen */}
            {showLoadingScreen && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
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
                    customForm={message.custom as CustomForm}
                    messageId={message.id}
                    feedbackState={
                      typeof message.id === "string"
                        ? feedbackStates[message.id] || "none"
                        : "none"
                    }
                    onButtonClick={handleButtonClick}
                    onShowContext={onShowContext}
                    onFeedbackSubmit={handleFeedbackSubmit}
                    onFeedbackRemove={handleFeedbackRemove}
                    onRetry={() => handleRetry(index)}
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
        </div>

        {/* Floating input */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2" style={{ background: "linear-gradient(transparent, var(--background) 30%)" }}>
          <div className="max-w-3xl mx-auto">
            <ChatInput
              ref={chatInputRef}
              onSendMessage={handleSendMessage}
              isLoading={chatState !== ChatState.IDLE}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatContent;
