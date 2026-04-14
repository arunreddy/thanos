import { Share2, RotateCw, Copy, Check, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useChatTheme } from "@/contexts/ChatThemeContext";
import { CATEGORY_STYLES } from "@/lib/constants";

interface TopNavProps {
  title: string | null;
  chatId?: string | null;
}

const TopNav: React.FC<TopNavProps> = ({ title, chatId }) => {
  const [copied, setCopied] = useState(false);
  const { theme } = useChatTheme();

  if (!title) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const catStyle = CATEGORY_STYLES[title];
  const CatIcon = catStyle?.icon ?? MessageSquare;

  // Truncate session ID for display
  const sessionLabel = chatId && chatId !== "unknown"
    ? chatId.length > 12
      ? `${chatId.slice(0, 6)}...${chatId.slice(-4)}`
      : chatId
    : null;

  return (
    <div
      className="flex items-center justify-between px-5 h-13 shrink-0"
      style={{
        background: theme.topBar.bg,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Category badge */}
        {catStyle ? (
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
            style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
          >
            <CatIcon className="w-3.5 h-3.5" />
            {title}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
            style={{ background: theme.topBar.border, color: theme.topBar.text, border: `1px solid ${theme.topBar.border}` }}>
            <MessageSquare className="w-3.5 h-3.5" />
            {title}
          </span>
        )}

        {/* Separator */}
        <div className="w-px h-5 shrink-0" style={{ background: theme.topBar.border }} />

        {/* Connection status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="w-1.75 h-1.75 rounded-full shrink-0"
            style={{
              background: theme.topBar.dotColor,
              boxShadow: `0 0 0 2px ${theme.topBar.dotColor}50`,
              animation: "livePulse 2s infinite",
            }}
          />
          <span
            className="text-[11px]"
            style={{ color: theme.topBar.textDim, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Connected
          </span>
        </div>

        {/* Session ID pill */}
        {sessionLabel && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
            style={{
              background: theme.topBar.border,
              border: `1px solid ${theme.topBar.border}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span className="text-[10px]" style={{ color: theme.topBar.textDim }}>Session</span>
            <span className="text-[10px] font-medium" style={{ color: theme.topBar.text }}>{sessionLabel}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <NavAction icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy link"} onClick={handleCopyLink} dimColor={theme.topBar.textDim} hoverColor={theme.topBar.text} />
        <NavAction icon={Share2} label="Share" dimColor={theme.topBar.textDim} hoverColor={theme.topBar.text} />
        <NavAction icon={RotateCw} label="Refresh" onClick={handleRefresh} dimColor={theme.topBar.textDim} hoverColor={theme.topBar.text} />
      </div>

      {/* Live pulse animation */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
};

function NavAction({ icon: Icon, label, onClick, dimColor, hoverColor }: { icon: React.ElementType; label: string; onClick?: () => void; dimColor: string; hoverColor: string }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md transition-colors cursor-pointer"
      style={{ color: dimColor }}
      onMouseEnter={(e) => { e.currentTarget.style.color = hoverColor; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = dimColor; }}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default TopNav;
