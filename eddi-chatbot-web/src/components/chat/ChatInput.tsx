import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Send, Plus, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export interface ChatInputRef {
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
  onSendMessage,
  isLoading,
}, ref) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
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

  const hasContent = message.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#fff",
          border: "1px solid #E2E5E9",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)",
        }}
      >
        {/* Textarea row */}
        <div className="flex items-end gap-1 px-3 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 leading-5 py-0.5"
            style={{ minHeight: "20px", maxHeight: "150px" }}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "#868E96" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#495057"; e.currentTarget.style.background = "#F1F3F5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#868E96"; e.currentTarget.style.background = "transparent"; }}
              title="Add context"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "#868E96" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#495057"; e.currentTarget.style.background = "#F1F3F5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#868E96"; e.currentTarget.style.background = "transparent"; }}
              title="Attach file"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!hasContent || isLoading}
            className="p-1.5 rounded-lg transition-all cursor-pointer disabled:cursor-default"
            style={{
              background: hasContent ? "#0B84F3" : "transparent",
              color: hasContent ? "#fff" : "#C1C7CD",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
