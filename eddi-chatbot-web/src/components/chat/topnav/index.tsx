import { Share2, RotateCw, Copy, Check, MessageSquare } from "lucide-react";
import { useState } from "react";
import { CATEGORY_STYLES } from "@/lib/constants";
import panelHeaderDesign from "@/lib/panelHeaderDesigns";

interface TopNavProps {
  title: string | null;
  chatId?: string | null;
}

const TopNav: React.FC<TopNavProps> = ({ title, chatId }) => {
  const [copied, setCopied] = useState(false);
  const [sessionCopied, setSessionCopied] = useState(false);
  if (!title) return null;

  const hd = panelHeaderDesign;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySession = () => {
    if (chatId) {
      navigator.clipboard.writeText(chatId);
      setSessionCopied(true);
      setTimeout(() => setSessionCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const catStyle = CATEGORY_STYLES[title];
  const CatIcon = catStyle?.icon ?? MessageSquare;

  const sessionLabel = chatId && chatId !== "unknown"
    ? chatId.length > 12
      ? `${chatId.slice(0, 6)}...${chatId.slice(-4)}`
      : chatId
    : null;

  return (
    <div
      className="flex items-center justify-between px-5 h-13 shrink-0"
      style={{ backgroundImage: hd.bg }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {catStyle ? (
          <span
            className="inline-flex items-center gap-2 h-7 px-3 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
          >
            <CatIcon className="w-3.5 h-3.5" />
            {title}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: hd.actionBg, color: hd.titleColor, border: `1px solid ${hd.actionBorder}` }}>
            <MessageSquare className="w-3.5 h-3.5" />
            {title}
          </span>
        )}

        {sessionLabel && (
          <button
            onClick={handleCopySession}
            title={sessionCopied ? "Copied!" : "Click to copy session ID"}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg shrink-0 cursor-pointer transition-all hover-surface"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div
              className="w-1.75 h-1.75 rounded-full shrink-0"
              style={{
                background: "#FFFFFF",
                boxShadow: "0 0 0 2px rgba(255,255,255,0.3)",
                animation: "livePulse 2s infinite",
              }}
            />
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>Session</span>
            <span className="text-[10px] font-medium" style={{ color: "#FFFFFF" }}>
              {sessionCopied ? "Copied!" : sessionLabel}
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <NavAction icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy link"} onClick={handleCopyLink} dimColor={hd.subtitleColor} hoverColor={hd.titleColor} />
        <NavAction icon={Share2} label="Share" dimColor={hd.subtitleColor} hoverColor={hd.titleColor} />
        <NavAction icon={RotateCw} label="Refresh" onClick={handleRefresh} dimColor={hd.subtitleColor} hoverColor={hd.titleColor} />
      </div>

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
