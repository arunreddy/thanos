// src/components/ChatMessage.tsx (updated)
import { format } from "date-fns";
import { User, Bot } from "lucide-react";
import { motion } from "framer-motion";

interface Button {
  title: string;
  payload: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  buttons?: Button[];
  onButtonClick?: (payload: string) => void;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  buttons = [],
  onButtonClick,
}: ChatMessageProps) {
  const isUser = role === "user";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const messageVariants = {
    hidden: {
      x: isUser ? 20 : -20,
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
        duration: 0.4,
      },
    },
    exit: {
      x: isUser ? 20 : -20,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  };

  // Ensure consistent animation by using a memo for the variants
  // This prevents animation glitches when messages are added/removed

  return (
    <motion.div
      className={`flex mb-4 items-start gap-2 ${
        isUser ? "justify-end" : "justify-start"
      }`}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      layout
    >
      {!isUser && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Bot className="w-6 h-6 mt-2 text-muted-foreground" />
        </motion.div>
      )}
      <motion.div
        variants={messageVariants}
        className={`
        max-w-[80%] rounded-lg px-4 py-2 
        ${
          isUser
            ? "bg-secondary text-secondary-foreground rounded-br-none"
            : "bg-background border border-border rounded-bl-none"
        }
      `}
      >
        <div className="whitespace-pre-wrap">{content}</div>

        {buttons && buttons.length > 0 && (
          <motion.div
            className="mt-3 pl-2 border-l-2 border-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-sm text-muted-foreground mb-1">
              Available options (type your response):
            </div>
            {buttons.map((button, index) => (
              <motion.div
                key={index}
                className="py-1 text-muted-foreground"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <button
                  className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded px-1"
                  onClick={() => onButtonClick && onButtonClick(button.payload)}
                  role="button"
                  aria-label={button.title}
                >
                  {index + 1}. {button.title}
                </button>{" "}
                <span className="text-xs text-muted-foreground/70">
                  (type: "{button.payload}")
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {timestamp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-xs mt-1 ${
              isUser ? "text-muted-foreground" : "text-muted-foreground"
            }`}
          >
            {format(new Date(timestamp), "h:mm a")}
          </motion.div>
        )}
      </motion.div>
      {isUser && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <User className="w-6 h-6 mt-2 text-muted-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
}
