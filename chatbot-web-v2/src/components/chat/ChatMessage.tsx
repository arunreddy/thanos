// src/components/ChatMessage.tsx (updated)
import { format } from "date-fns";
import { User, Bot } from "lucide-react";

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

  return (
    <div className={`flex mb-4 items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Bot className="w-6 h-6 mt-2 text-muted-foreground" />}
      <div
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
          <div className="mt-2 flex flex-col space-y-2">
            {buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => onButtonClick?.(button.payload)}
                className="px-4 py-2 bg-muted hover:bg-muted/90 text-muted-foreground rounded border border-border text-left cursor-pointer"
              >
                {button.title}
              </button>
            ))}
          </div>
        )}

        {timestamp && (
          <div
            className={`text-xs mt-1 ${
              isUser ? "text-muted-foreground" : "text-muted-foreground"
            }`}
          >
            {format(new Date(timestamp), "h:mm a")}
          </div>
        )}
      </div>
      {isUser && <User className="w-6 h-6 mt-2 text-muted-foreground" />}
    </div>
  );
}
