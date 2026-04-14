import { AnimatePresence, motion } from "framer-motion";
import { X, BarChart3, Database, FileText, Activity, Copy, Download, Check } from "lucide-react";
import { useState, useRef } from "react";
import ExecutionPlanVisualization from "../ExecutionPlanVisualization";
import SchemaDefinitionsVisualization from "../SchemaDefinitionsVisualization";
import HealthDashboard from "../HealthDashboard";
import { downloadAs } from "../../utils/export";

export interface ContextPanelData {
  type: "execution_plan" | "schema" | "health" | "custom";
  title: string;
  data: Record<string, unknown>;
}

interface ContextPanelProps {
  context: ContextPanelData | null;
  onClose: () => void;
}

const PANEL_ICONS: Record<string, React.ElementType> = {
  execution_plan: BarChart3,
  schema: Database,
  health: Activity,
  custom: FileText,
};

const PANEL_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  execution_plan: { label: "EXECUTION PLAN", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  schema:         { label: "SCHEMA",         color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  health:         { label: "OBSERVABILITY",  color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  custom:         { label: "RESULT",         color: "#495057", bg: "#F8F9FA", border: "#DEE2E6" },
};

export default function ContextPanel({ context, onClose }: ContextPanelProps) {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!context) return null;

  const Icon = PANEL_ICONS[context.type] || FileText;
  const badge = PANEL_BADGES[context.type] || PANEL_BADGES.custom;

  const handleCopy = () => {
    const text = contentRef.current?.innerText || JSON.stringify(context.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadAs(context.data, "json", `${context.type}-${Date.now()}`);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={context.title}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col h-full overflow-hidden"
        style={{ background: "#ECEEF1" }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="flex items-center justify-between px-5 h-13 shrink-0"
          style={{ borderBottom: "1px solid #E9ECEF", background: "#FFFFFF" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#E6F4EF", color: "#008555" }}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <h2
              className="text-sm font-semibold truncate"
              style={{ color: "#1A1E2E" }}
            >
              {context.title}
            </h2>
            <span
              className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full shrink-0"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "#495057",
                border: "1px solid #DEE2E6",
                background: "#FFFFFF",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CED4DA"; e.currentTarget.style.color = "#1A1E2E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#DEE2E6"; e.currentTarget.style.color = "#495057"; }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "#FFFFFF",
                background: "#1A1E2E",
                border: "1px solid #1A1E2E",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#2c3347"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1A1E2E"; }}
            >
              <Download className="w-3 h-3" />
              Export
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors cursor-pointer ml-1"
              style={{ color: "#868E96" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#E9ECEF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex-1 overflow-y-auto"
          ref={contentRef}
        >
          <ContextContent context={context} />
        </motion.div>

        {/* Export Footer */}
        <ExportFooter context={context} />
      </motion.div>
    </AnimatePresence>
  );
}

function ExportFooter({ context }: { context: ContextPanelData }) {
  const formats = [
    { label: "CSV", icon: "📊", color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4", sub: "Excel-ready" },
    { label: "JSON", icon: "{ }", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", sub: "API-ready" },
    { label: "Text", icon: "📄", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", sub: "Tab-separated" },
  ] as const;

  const handleExport = (format: string) => {
    downloadAs(context.data, format.toLowerCase() as "csv" | "json" | "text", `${context.type}-${Date.now()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 }}
      className="shrink-0 px-4 py-3"
      style={{ background: "#ECEEF1" }}
    >
      <div className="grid grid-cols-3 gap-2">
        {formats.map((f) => (
          <motion.button
            key={f.label}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleExport(f.label)}
            className="flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all cursor-pointer"
            style={{ border: `1px solid ${f.border}`, background: f.bg }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = f.color; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = f.border; }}
          >
            <span className="text-base">{f.icon}</span>
            <span className="text-xs font-semibold" style={{ color: f.color }}>{f.label}</span>
            <span className="text-[10px]" style={{ color: "#868E96", fontFamily: "'JetBrains Mono', monospace" }}>{f.sub}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function ContextContent({ context }: { context: ContextPanelData }) {
  // Data is typed as Record<string, unknown> because it comes from the API.
  // Each visualization component expects a specific shape; the discriminated
  // `type` field guarantees the data matches at runtime.
  const data = context.data;

  switch (context.type) {
    case "execution_plan":
      return <ExecutionPlanVisualization data={data as unknown as React.ComponentProps<typeof ExecutionPlanVisualization>["data"]} />;

    case "schema":
      return <SchemaDefinitionsVisualization data={data as unknown as React.ComponentProps<typeof SchemaDefinitionsVisualization>["data"]} />;

    case "health":
      return <HealthDashboard key={data?.resource_id as string} data={data as React.ComponentProps<typeof HealthDashboard>["data"]} />;

    default:
      return (
        <div className="p-6">
          <pre className="text-sm whitespace-pre-wrap" style={{ color: "#495057" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
}

