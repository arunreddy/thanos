import { Share2, RotateCw, Copy, Check, Database, Server, Zap, Radio, MessageSquare } from "lucide-react";
import { useState } from "react";

const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  "Recommend DB": { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: Database },
  "Provision DB":  { color: "#008555", bg: "#E6F4EF", border: "#B3D9CC", icon: Server },
  "Health":        { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", icon: Zap },
  "Kafka Assist":  { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: Radio },
};

interface TopNavProps {
  title: string | null;
  chatId?: string | null;
}

const TopNav: React.FC<TopNavProps> = ({ title, chatId }) => {
  const [copied, setCopied] = useState(false);

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
        background: "#1A1E2E",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
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
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <MessageSquare className="w-3.5 h-3.5" />
            {title}
          </span>
        )}

        {/* Separator */}
        <div className="w-px h-5 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />

        {/* Connection status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="w-1.75 h-1.75 rounded-full shrink-0"
            style={{
              background: "#22C55E",
              boxShadow: "0 0 0 2px rgba(34,197,94,0.3)",
              animation: "livePulse 2s infinite",
            }}
          />
          <span
            className="text-[11px]"
            style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            Connected
          </span>
        </div>

        {/* Session ID pill */}
        {sessionLabel && (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Session</span>
            <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{sessionLabel}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <NavAction icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy link"} onClick={handleCopyLink} />
        <NavAction icon={Share2} label="Share" />
        <NavAction icon={RotateCw} label="Refresh" onClick={handleRefresh} />
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

function NavAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md transition-colors cursor-pointer"
      style={{ color: "rgba(255,255,255,0.4)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.background = "transparent"; }}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default TopNav;
