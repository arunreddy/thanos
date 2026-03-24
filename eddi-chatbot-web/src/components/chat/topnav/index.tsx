import { Share2, RotateCw, Copy, Check } from "lucide-react";
import { useState } from "react";

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

  return (
    <div
      className="flex items-center justify-between px-5 h-12 flex-shrink-0"
      style={{ borderBottom: "1px solid #E9ECEF" }}
    >
      <span
        className="text-sm font-semibold truncate max-w-[70%]"
        style={{ color: "#1A1E2E" }}
      >
        {title}
      </span>
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
