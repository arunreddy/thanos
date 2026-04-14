import { useState } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import type { FeedbackType } from "@/types";
import theme from "@/lib/chatThemes";

interface MessageActionsProps {
  content: string;
  feedbackState: FeedbackType | "none";
  onFeedback: (type: FeedbackType) => void;
  onRetry?: () => void;
  disabled?: boolean;
}

export default function MessageActions({
  content,
  feedbackState,
  onFeedback,
  onRetry,
  disabled,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      <ActionButton
        icon={copied ? Check : Copy}
        label={copied ? "Copied!" : "Copy"}
        onClick={handleCopy}
      />
      <ActionButton
        icon={ThumbsUp}
        label="Good response"
        onClick={() => onFeedback("positive")}
        active={feedbackState === "positive"}
        activeColor="#10B981"
        disabled={disabled}
      />
      <ActionButton
        icon={ThumbsDown}
        label="Bad response"
        onClick={() => onFeedback("negative")}
        active={feedbackState === "negative"}
        activeColor="#EF4444"
        disabled={disabled}
      />
      {onRetry && (
        <ActionButton
          icon={RotateCcw}
          label="Retry"
          onClick={onRetry}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
  activeColor,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover-surface"
      style={{ color: active ? activeColor : theme.actions.color }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.color = theme.actions.hoverColor;
          e.currentTarget.style.background = theme.sidebar.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = theme.actions.color;
        }
        e.currentTarget.style.background = "transparent";
      }}
      title={label}
    >
      <Icon
        className="w-4 h-4"
        fill={active ? "currentColor" : "none"}
        strokeWidth={active ? 0 : 2}
      />
    </button>
  );
}
