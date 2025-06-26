import { useState, useRef, useEffect } from "react";
import { Send, Plus, ArrowUp } from "lucide-react";
import Button from "../ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");

      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto px-4">
      {/* Greeting */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-light">
          <span className="mr-2">✧</span>
          Good afternoon, Arun
        </h1>
      </div>

      {/* Chat Input Area */}
      <div className="w-full">
        <form onSubmit={handleSubmit} className="relative w-full">
          <div className="relative flex items-center w-full bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
            <div className="flex items-center px-3 border-r border-[#3A3A3A]">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can I help you today?"
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent border-0 resize-none px-4 py-3 focus:outline-none text-sm"
            />

            <div className="flex items-center gap-2 px-3">
              <div className="text-sm text-muted-foreground">
                Claude 3.7 Sonnet
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim() || isLoading}
                className="h-8 w-8 rounded-full bg-[#C15E3A]"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        {[
          { label: "Write", icon: "✎" },
          { label: "Learn", icon: "↗" },
          { label: "Code", icon: "</>" },
          { label: "Life stuff", icon: "☘" },
          { label: "Connect apps", icon: "⚡" },
        ].map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className="text-sm px-4 py-2 rounded-full border border-[#3A3A3A] bg-[#2A2A2A] hover:bg-[#3A3A3A]"
          >
            <span className="mr-2">{action.icon}</span>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
