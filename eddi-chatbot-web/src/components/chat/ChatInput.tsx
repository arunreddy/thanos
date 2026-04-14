import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Send, Plus, Paperclip } from "lucide-react";

const QUICK_TAGS = [
  { label: "Slow Query", prompt: "Check slow queries on ", dotColor: "#D97706" },
  { label: "Explain Plan", prompt: "EXPLAIN ANALYZE: ", dotColor: "#2563EB" },
  { label: "Index Check", prompt: "Check index usage for ", dotColor: "#0D9488" },
  { label: "Query Tuning", prompt: "Tune this query: ", dotColor: "#7C3AED" },
  { label: "Locks", prompt: "Check active locks on ", dotColor: "#DC3545" },
  { label: "Performance", prompt: "Show performance metrics for ", dotColor: "#008555" },
] as const;

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

  const handleQuickTag = (prompt: string) => {
    setMessage(prompt);
    textareaRef.current?.focus();
  };

  const hasContent = message.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Quick action tags */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag.label}
            type="button"
            onClick={() => handleQuickTag(tag.prompt)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] transition-all cursor-pointer"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "#495057",
              background: "#F8F9FA",
              border: "1px solid #DEE2E6",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#008555";
              e.currentTarget.style.color = "#008555";
              e.currentTarget.style.background = "#E6F4EF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#DEE2E6";
              e.currentTarget.style.color = "#495057";
              e.currentTarget.style.background = "#F8F9FA";
            }}
          >
            <span
              className="w-1.25 h-1.25 rounded-full shrink-0"
              style={{ background: tag.dotColor }}
            />
            {tag.label}
          </button>
        ))}
      </div>

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
            placeholder="Ask a question, paste SQL, or request analysis..."
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
