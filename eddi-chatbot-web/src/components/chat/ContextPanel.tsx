import { AnimatePresence, motion } from "framer-motion";
import { X, BarChart3, Database, FileText, Activity, Copy, Check } from "lucide-react";
import { useState, useRef } from "react";
import { downloadAs } from "../../utils/export";
import ExecutionPlanVisualization from "../ExecutionPlanVisualization";
import SchemaDefinitionsVisualization from "../SchemaDefinitionsVisualization";
import HealthDashboard from "../HealthDashboard";

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


export default function ContextPanel({ context, onClose }: ContextPanelProps) {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!context) return null;

  const Icon = PANEL_ICONS[context.type] || FileText;

  const handleCopy = () => {
    const text = contentRef.current?.innerText || JSON.stringify(context.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          style={{ background: "#ECEEF1" }}
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
          className="flex-1 overflow-y-auto pb-6"
          ref={contentRef}
        >
          <ContextContent context={context} />
        </motion.div>

        {/* Export footer */}
        <ExportCards data={context.data} type={context.type} />

      </motion.div>
    </AnimatePresence>
  );
}

function ExportCards({ data, type }: { data: Record<string, unknown>; type: string }) {
  const CsvIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#0D9488" strokeWidth="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="#0D9488" strokeWidth="1.5" />
      <line x1="3" y1="15" x2="21" y2="15" stroke="#0D9488" strokeWidth="1.5" />
      <line x1="9" y1="3" x2="9" y2="21" stroke="#0D9488" strokeWidth="1.5" />
      <line x1="15" y1="3" x2="15" y2="21" stroke="#0D9488" strokeWidth="1.5" />
    </svg>
  );

  const JsonIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4C6.5 4 5.5 5 5.5 6.5V9C5.5 10 5 11 3.5 11.5C5 12 5.5 13 5.5 14V17.5C5.5 19 6.5 20 8 20" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 4C17.5 4 18.5 5 18.5 6.5V9C18.5 10 19 11 20.5 11.5C19 12 18.5 13 18.5 14V17.5C18.5 19 17.5 20 16 20" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.5" cy="12" r="1" fill="#2563EB" />
      <circle cx="14.5" cy="12" r="1" fill="#2563EB" />
    </svg>
  );

  const TextIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="#7C3AED" strokeWidth="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="12" x2="14" y2="12" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="16" x2="12" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const formats = [
    { label: "CSV", IconComponent: CsvIcon, color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4", sub: "Excel-ready", format: "csv" as const },
    { label: "JSON", IconComponent: JsonIcon, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", sub: "API-ready", format: "json" as const },
    { label: "Plain Text", IconComponent: TextIcon, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", sub: "Tab-separated", format: "text" as const },
  ];

  return (
    <div className="shrink-0 px-4 pt-3 pb-6" style={{ background: "#ECEEF1" }}>
      <div className="grid grid-cols-3 gap-2">
        {formats.map((f) => (
          <button
            key={f.label}
            onClick={() => downloadAs(data, f.format, `${type}-${Date.now()}`)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all cursor-pointer hover-surface"
            style={{ background: f.bg, border: `1px solid ${f.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = f.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
          >
            <f.IconComponent />
            <span className="text-xs font-semibold" style={{ color: f.color }}>{f.label}</span>
            <span className="text-[10px]" style={{ color: "#868E96", fontFamily: "'JetBrains Mono', monospace" }}>{f.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ContextContent({ context }: { context: ContextPanelData }) {
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

