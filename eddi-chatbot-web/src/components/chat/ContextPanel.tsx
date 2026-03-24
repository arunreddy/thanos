import { AnimatePresence, motion } from "framer-motion";
import { X, BarChart3, Database, FileText, Activity } from "lucide-react";
import ExecutionPlanVisualization from "../ExecutionPlanVisualization";
import SchemaDefinitionsVisualization from "../SchemaDefinitionsVisualization";
import HealthDashboard from "../HealthDashboard";

export interface ContextPanelData {
  type: "execution_plan" | "schema" | "health" | "custom";
  title: string;
  data: any;
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
  if (!context) return null;

  const Icon = PANEL_ICONS[context.type] || FileText;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={context.title}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col h-full overflow-hidden"
        style={{ background: "#FAFBFC" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-12 flex-shrink-0"
          style={{ borderBottom: "1px solid #E9ECEF" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "#868E96" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#E9ECEF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <ContextContent context={context} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ContextContent({ context }: { context: ContextPanelData }) {
  switch (context.type) {
    case "execution_plan":
      return <ExecutionPlanVisualization data={context.data} />;

    case "schema":
      return <SchemaDefinitionsVisualization data={context.data} />;

    case "health":
      return <HealthDashboard data={context.data} />;

    default:
      return (
        <div className="p-6">
          <pre className="text-sm whitespace-pre-wrap" style={{ color: "#495057" }}>
            {JSON.stringify(context.data, null, 2)}
          </pre>
        </div>
      );
  }
}

