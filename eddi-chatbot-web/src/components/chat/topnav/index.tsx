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
}

const TopNav: React.FC<TopNavProps> = ({ title }) => {
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

  return (
    <div
      className="flex items-center justify-between px-6 h-14 flex-shrink-0"
      style={{
        borderBottom: "1px solid #E9ECEF",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Category badge or generic label */}
      {catStyle ? (
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
        >
          <CatIcon className="w-3.5 h-3.5" />
          {title}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{ background: "#F1F3F5", color: "#495057", border: "1px solid #DEE2E6" }}>
          <MessageSquare className="w-3.5 h-3.5" />
          {title}
        </span>
      )}

      <div className="flex items-center gap-0.5">
        <NavAction icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy link"} onClick={handleCopyLink} />
        <NavAction icon={Share2} label="Share" />
        <NavAction icon={RotateCw} label="Refresh" onClick={handleRefresh} />
      </div>
    </div>
  );
};

function NavAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md transition-colors cursor-pointer"
      style={{ color: "#ADB5BD" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#495057"; e.currentTarget.style.background = "#F1F3F5"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#ADB5BD"; e.currentTarget.style.background = "transparent"; }}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default TopNav;
