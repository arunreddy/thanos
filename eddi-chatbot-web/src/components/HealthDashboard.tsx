import { Monitor, HardDrive, Database, Activity, Zap, Network } from "lucide-react";

interface VitalMetric {
  label: string;
  value: number | string;
  unit?: string;
  icon: React.ElementType;
  threshold?: { warn: number; critical: number };
}

interface LockEvent {
  pid: number;
  query: string;
  wait_type: string;
  duration: string;
  state: "BLOCKED" | "WAITING" | "ACTIVE" | "IDLE";
}

interface Suggestion {
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  message: string;
}

interface HealthDashboardProps {
  data: {
    vitals?: {
      cpu_usage?: number;
      memory_usage?: number;
      disk_io?: number;
      connections?: number;
      max_connections?: number;
      cache_hit?: number;
      tps?: number;
    };
    locks?: LockEvent[];
    suggestions?: Suggestion[];
    timestamp?: string;
    database_name?: string;
    message?: string;
  };
}

function getColor(value: number, warn: number, critical: number) {
  if (value >= critical) return { bg: "#DC3545", text: "#DC3545", bar: "#DC3545" };
  if (value >= warn) return { bg: "#FFC107", text: "#E8A800", bar: "#FFC107" };
  return { bg: "#28A745", text: "#28A745", bar: "#28A745" };
}

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  BLOCKED: { bg: "#FEE8EA", text: "#DC3545" },
  WAITING: { bg: "#FFF3CD", text: "#856404" },
  ACTIVE: { bg: "#D4EDDA", text: "#155724" },
  IDLE: { bg: "#E2E8F0", text: "#4A5568" },
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  CRITICAL: { border: "#DC3545", bg: "#FFF5F5", badge: "#DC3545", badgeText: "#fff" },
  HIGH: { border: "#FFC107", bg: "#FFFBEB", badge: "#F59E0B", badgeText: "#fff" },
  MEDIUM: { border: "#3B82F6", bg: "#EFF6FF", badge: "#3B82F6", badgeText: "#fff" },
};

function VitalCard({ metric }: { metric: VitalMetric }) {
  const numValue = typeof metric.value === "number" ? metric.value : 0;
  const threshold = metric.threshold || { warn: 70, critical: 85 };
  const color = getColor(numValue, threshold.warn, threshold.critical);
  const Icon = metric.icon;
  const displayValue = typeof metric.value === "number" && metric.unit === "%"
    ? `${metric.value}%`
    : String(metric.value);

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "#fff", border: "1px solid #E9ECEF" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#868E96" }}>
          {metric.label}
        </span>
        <Icon className="w-3.5 h-3.5" style={{ color: "#ADB5BD" }} />
      </div>
      <div className="text-xl font-bold" style={{ color: color.text }}>
        {displayValue}
      </div>
      {metric.unit === "%" && (
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#E9ECEF" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(numValue, 100)}%`, background: color.bar }}
          />
        </div>
      )}
    </div>
  );
}

// Renders suggestion text with DB terms styled as inline code
function SuggestionText({ text }: { text: string }) {
  // Match known DB terms/functions, config params, and backtick-wrapped text
  const pattern = /(`[^`]+`|pg_\w+(?:\([^)]*\))?|shared_buffers|huge_pages|work_mem|effective_cache_size|maintenance_work_mem|wal_buffers|max_connections|checkpoint_completion_target|random_page_cost|effective_io_concurrency|innodb_\w+|SELECT\s|UPDATE\s|INSERT\s|DELETE\s|PID\s+\d+)/g;

  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const term = match[0].replace(/^`|`$/g, ""); // strip backticks if present
    parts.push(
      <code
        key={match.index}
        style={{
          background: "#F1F3F5",
          color: "#D6336C",
          padding: "1px 5px",
          borderRadius: 4,
          fontSize: "0.85em",
          fontFamily: "monospace",
        }}
      >
        {term}
      </code>
    );
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

export default function HealthDashboard({ data }: HealthDashboardProps) {
  const vitals = data.vitals || {};
  const locks = data.locks || [];
  const suggestions = data.suggestions || [];
  const timestamp = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const metrics: VitalMetric[] = [
    { label: "CPU", value: vitals.cpu_usage ?? 0, unit: "%", icon: Monitor, threshold: { warn: 70, critical: 85 } },
    { label: "Memory", value: vitals.memory_usage ?? 0, unit: "%", icon: Activity, threshold: { warn: 70, critical: 85 } },
    { label: "Disk I/O", value: vitals.disk_io ?? 0, unit: "%", icon: HardDrive, threshold: { warn: 75, critical: 90 } },
    { label: "Connections", value: `${vitals.connections ?? 0}`, icon: Network, threshold: { warn: 80, critical: 95 } },
    { label: "Cache Hit", value: vitals.cache_hit ?? 0, unit: "%", icon: Zap, threshold: { warn: 90, critical: 80 } },
    { label: "TPS", value: `${vitals.tps?.toLocaleString() ?? 0}`, icon: Database },
  ];

  // For cache hit, invert the color logic (lower is worse)
  const cacheColor = vitals.cache_hit != null
    ? vitals.cache_hit < 80 ? "#DC3545" : vitals.cache_hit < 90 ? "#FFC107" : "#28A745"
    : "#28A745";

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4" style={{ color: "#495057" }} />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#495057" }}>
            Database Vitals
          </h3>
        </div>
        {timestamp && (
          <span className="text-[11px]" style={{ color: "#ADB5BD" }}>
            as of {timestamp}
          </span>
        )}
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => {
          // Special handling for cache hit (invert threshold)
          if (metric.label === "Cache Hit") {
            return (
              <div
                key={metric.label}
                className="rounded-lg p-3"
                style={{ background: "#fff", border: "1px solid #E9ECEF" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#868E96" }}>
                    {metric.label}
                  </span>
                  <Zap className="w-3.5 h-3.5" style={{ color: "#ADB5BD" }} />
                </div>
                <div className="text-xl font-bold" style={{ color: cacheColor }}>
                  {vitals.cache_hit ?? 0}%
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#E9ECEF" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${vitals.cache_hit ?? 0}%`, background: cacheColor }}
                  />
                </div>
              </div>
            );
          }
          return <VitalCard key={metric.label} metric={metric} />;
        })}
      </div>

      {/* Lock & Wait Events */}
      {locks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: "#495057" }}>
                Lock & Wait Events
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "#ADB5BD" }}>
              {locks.length} active processes
            </span>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E9ECEF" }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "#F8F9FA", borderBottom: "1px solid #E9ECEF" }}>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>PID</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Query</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Wait Type</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Duration</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>State</th>
                </tr>
              </thead>
              <tbody>
                {locks.map((lock, i) => {
                  const stateStyle = STATE_COLORS[lock.state] || STATE_COLORS.IDLE;
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: i < locks.length - 1 ? "1px solid #F1F3F5" : undefined }}
                    >
                      <td className="px-3 py-2 font-mono" style={{ color: "#495057" }}>{lock.pid}</td>
                      <td className="px-3 py-2 font-mono truncate max-w-[200px]" style={{ color: "#495057" }}>{lock.query}</td>
                      <td className="px-3 py-2" style={{ color: "#868E96" }}>{lock.wait_type || "—"}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: "#495057" }}>{lock.duration}</td>
                      <td className="px-3 py-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ background: stateStyle.bg, color: stateStyle.text }}
                        >
                          {lock.state}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: "#495057" }}>
              Suggestions
            </span>
          </div>
          <div className="space-y-3">
            {suggestions.map((suggestion, i) => {
              const style = SEVERITY_STYLES[suggestion.severity] || SEVERITY_STYLES.MEDIUM;
              return (
                <div
                  key={i}
                  className="rounded-r-lg px-5 py-4"
                  style={{ background: style.bg, borderLeft: `4px solid ${style.border}` }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded flex-shrink-0 mt-0.5"
                      style={{ background: style.badge, color: style.badgeText, letterSpacing: "0.05em" }}
                    >
                      {suggestion.severity}
                    </span>
                    <span className="text-[13px] leading-relaxed" style={{ color: "#1A1E2E" }}>
                      <SuggestionText text={suggestion.message} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback if no vitals data */}
      {!data.vitals && data.message && (
        <div className="text-sm" style={{ color: "#495057" }}>
          {data.message}
        </div>
      )}
    </div>
  );
}
