import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, X, TrendingUp, TrendingDown, Minus, AlertCircle, AlertTriangle, Lightbulb, Lock, Activity } from "lucide-react";
import MetricChart, { MetricDataPoint } from "./MetricChart";

interface VitalMetric {
  label: string;
  metricKey: string;
  value: number;
  unit: string;
  history?: MetricDataPoint[];
}

interface AvailableMetric {
  metric: string;
  unit: string;
  description: string;
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

interface MetricHistoryItem {
  resource_id: string;
  resource_name: string;
  sys_id: string;
  db_type: string;
  metric: string;
  unit: string;
  ts: string;
  value: number;
}

interface HealthDashboardProps {
  data: {
    resource_id?: string;
    vitals?: Record<string, number>;
    locks?: LockEvent[];
    suggestions?: Suggestion[];
    timestamp?: string;
    database_name?: string;
    message?: string;
    metrics_history?: MetricHistoryItem[];
    available_metrics?: AvailableMetric[];
    default_metrics?: string[];
  };
}

// Neutral color for metrics where thresholds aren't meaningful
const NEUTRAL_COLOR = { text: "#495057", bar: "#ADB5BD" };

function getColor(value: number, warn: number, critical: number, invert = false) {
  // invert=true: lower is worse (e.g. cache hit rate, freeable memory)
  if (invert) {
    if (value <= critical) return { text: "#DC3545", bar: "#DC3545" };
    if (value <= warn)     return { text: "#E8A800", bar: "#FFC107" };
    return                        { text: "#28A745", bar: "#28A745" };
  }
  if (value >= critical) return { text: "#DC3545", bar: "#DC3545" };
  if (value >= warn)     return { text: "#E8A800", bar: "#FFC107" };
  return                        { text: "#28A745", bar: "#28A745" };
}

// Per-metric thresholds: { warn, critical, invert? }
// invert=true means lower value = worse (e.g. cache hit %, freeable memory)
// Metrics not listed here get NEUTRAL color (no meaningful global threshold)
const METRIC_THRESHOLDS: Record<string, { warn: number; critical: number; invert?: boolean }> = {
  // Percentage metrics — higher = worse
  cpu_utilization:                                          { warn: 70,   critical: 85 },
  disk_space_usage:                                         { warn: 75,   critical: 90 },
  usage_of_the_replication_log:                             { warn: 70,   critical: 85 },

  // Percentage metrics — lower = worse (invert)
  percentage_of_read_requests_served_by_the_buffer_cache:   { warn: 90,   critical: 80,  invert: true },

  // Time metrics (ms) — higher = worse
  average_query_execution_time:                             { warn: 1000, critical: 3000 },
  average_lock_wait_time:                                   { warn: 500,  critical: 2000 },
  average_transaction_duration:                             { warn: 5,    critical: 15 },   // sec
  disk_read_latency:                                        { warn: 20,   critical: 50 },
  disk_write_latency:                                       { warn: 20,   critical: 50 },
  network_latency:                                          { warn: 50,   critical: 200 },
  io_wait_time:                                             { warn: 100,  critical: 500 },
  replication_lag:                                          { warn: 1000, critical: 5000 },
  time_delay_between_primary_and_replica:                   { warn: 1000, critical: 5000 },
  wait_times_time_taken_to_establish_connections:           { warn: 500,  critical: 2000 },

  // Count metrics — higher = worse
  connection_errors:                                        { warn: 1,    critical: 10 },
  number_of_deadlocks_detected:                             { warn: 1,    critical: 5 },
  slow_query_counts:                                        { warn: 5,    critical: 20 },
  lock_connection_counts:                                   { warn: 5,    critical: 20 },
  number_of_rolled_back_transactions:                       { warn: 10,   critical: 50 },

  // Memory/storage metrics (MB) — lower freeable = worse (invert)
  freeable_memory:                                          { warn: 512,  critical: 256,  invert: true },
  free_buffer_space:                                        { warn: 256,  critical: 128,  invert: true },
  free_storage_space:                                       { warn: 1024, critical: 512,  invert: true },

  // Datadog (Flow B) metric keys
  cpu_utilization_pct:                                      { warn: 70,   critical: 85 },
  freeable_memory_mb:                                       { warn: 512,  critical: 256,  invert: true },
  read_iops:                                                { warn: 1000, critical: 5000 },
  write_iops:                                               { warn: 1000, critical: 5000 },
  read_latency_ms:                                          { warn: 20,   critical: 50 },
  write_latency_ms:                                         { warn: 20,   critical: 50 },
  container_restarts:                                       { warn: 1,    critical: 5 },
};

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  BLOCKED: { bg: "#FEE8EA", text: "#DC3545" },
  WAITING: { bg: "#FFF3CD", text: "#856404" },
  ACTIVE: { bg: "#D4EDDA", text: "#155724" },
  IDLE: { bg: "#E2E8F0", text: "#4A5568" },
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string; badgeBg: string }> = {
  CRITICAL: { border: "#DC3545", bg: "#FEE8EA", badge: "#DC3545", badgeText: "#DC3545", badgeBg: "#FEE8EA" },
  HIGH:     { border: "#D97706", bg: "#FEF3C7", badge: "#D97706", badgeText: "#D97706", badgeBg: "#FEF3C7" },
  MEDIUM:   { border: "#2563EB", bg: "#EFF6FF", badge: "#2563EB", badgeText: "#2563EB", badgeBg: "#EFF6FF" },
};

function formatMetricLabel(metric: string): string {
  return metric
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Calculate trend from history data
function getTrend(history: MetricDataPoint[] | undefined): "up" | "down" | "stable" {
  if (!history || history.length < 2) return "stable";
  const sorted = [...history].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const changePercent = ((last - first) / (first || 1)) * 100;
  if (Math.abs(changePercent) < 5) return "stable";
  return changePercent > 0 ? "up" : "down";
}

// Get color for chart based on metric status
function getChartColor(metricKey: string, value: number): string {
  const thresholdDef = METRIC_THRESHOLDS[metricKey];
  if (!thresholdDef) return "#228BE6"; // Default blue
  const status = getColor(value, thresholdDef.warn, thresholdDef.critical, thresholdDef.invert);
  if (status.text === "#DC3545") return "#DC3545"; // Critical - red
  if (status.text === "#E8A800") return "#F59E0B"; // Warning - amber
  return "#10B981"; // Healthy - green
}

interface VitalCardProps {
  metric: VitalMetric;
  onClick: () => void;
  index: number;
}

function VitalCard({ metric, onClick, index }: VitalCardProps) {
  const numValue = typeof metric.value === "number" ? metric.value : 0;
  const thresholdDef = METRIC_THRESHOLDS[metric.metricKey];
  const color = thresholdDef
    ? getColor(numValue, thresholdDef.warn, thresholdDef.critical, thresholdDef.invert)
    : NEUTRAL_COLOR;

  const isPercentage = metric.unit === "percentage" || metric.unit === "%";
  const displayValue = isPercentage
    ? `${numValue.toFixed(1)}%`
    : `${numValue.toFixed(2)}${metric.unit ? ` ${metric.unit}` : ""}`;

  const trend = getTrend(metric.history);
  const chartColor = getChartColor(metric.metricKey, numValue);
  const hasHistory = metric.history && metric.history.length > 1;

  // Calculate deviation from average
  const avgStats = hasHistory
    ? (() => {
        const values = metric.history!.map((h) => h.value);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const deviation = numValue - avg;
        const deviationPercent = avg !== 0 ? (deviation / avg) * 100 : 0;
        return { avg, deviation, deviationPercent };
      })()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.06 }}
      whileHover={{ y: -3, boxShadow: "0 8px 20px rgba(0,0,0,0.12)", transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className="rounded-xl p-3.5 cursor-pointer flex flex-col"
      style={{
        background: color.text === "#DC3545" ? "#FFF5F5"
          : color.text === "#E8A800" ? "#FFFDF5"
          : color.text === "#28A745" ? "#F0FFF5"
          : "#FFFFFF",
        borderTop: `3px solid ${color.bar}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        minHeight: "180px",
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium uppercase tracking-wide truncate" style={{ color: "#868E96" }}>
          {metric.label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5" style={{ color: thresholdDef?.invert ? "#DC3545" : "#10B981" }} />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5" style={{ color: thresholdDef?.invert ? "#10B981" : "#DC3545" }} />}
          {trend === "stable" && <Minus className="w-3.5 h-3.5" style={{ color: "#868E96" }} />}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold font-mono" style={{ color: color.text }}>
          {displayValue}
        </div>
        {avgStats && (
          <div
            className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: avgStats.deviation >= 0 ? "#ECFDF5" : "#FEF2F2",
              color: avgStats.deviation >= 0 ? "#059669" : "#DC2626",
            }}
          >
            {avgStats.deviation >= 0 ? "+" : ""}{avgStats.deviationPercent.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Status label */}
      {thresholdDef && (
        <div className="mt-1.5">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background:
                color.text === "#DC3545" ? "#FEE8EA" :
                color.text === "#E8A800" ? "#FFF3CD" : "#D4EDDA",
              color: color.text,
            }}
          >
            {color.text === "#DC3545" ? "● Critical" : color.text === "#E8A800" ? "● Warning" : "● Healthy"}
          </span>
        </div>
      )}

      {/* Sparkline chart — pinned to bottom */}
      <div className="mt-auto pt-2">
        {hasHistory ? (
          <div className="h-12">
            <MetricChart
              data={metric.history!}
              metricKey={metric.metricKey}
              unit={metric.unit}
              color={chartColor}
              mode="sparkline"
              height={48}
            />
          </div>
        ) : isPercentage ? (
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E9ECEF" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(numValue, 100)}%`, background: color.bar }}
            />
          </div>
        ) : <div className="h-12" />}
      </div>

      {hasHistory && (
        <div className="mt-1 flex items-center justify-between text-[9px]" style={{ color: "#ADB5BD" }}>
          <span>Avg: {avgStats?.avg.toFixed(1)}</span>
          <span>Click to expand</span>
        </div>
      )}
    </motion.div>
  );
}

// Renders suggestion text with DB terms styled as inline code
function SuggestionText({ text }: { text: string }) {
  const pattern = /(`[^`]+`|pg_\w+(?:\([^)]*\))?|shared_buffers|huge_pages|work_mem|effective_cache_size|maintenance_work_mem|wal_buffers|max_connections|checkpoint_completion_target|random_page_cost|effective_io_concurrency|innodb_\w+|SELECT\s|UPDATE\s|INSERT\s|DELETE\s|PID\s+\d+)/g;

  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const term = match[0].replace(/^`|`$/g, "");
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

// ---------------------------------------------------------------------------
// Expanded chart modal
// ---------------------------------------------------------------------------

interface ExpandedChartProps {
  metric: VitalMetric;
  onClose: () => void;
}

function ExpandedChart({ metric, onClose }: ExpandedChartProps) {
  const thresholdDef = METRIC_THRESHOLDS[metric.metricKey];
  const chartColor = getChartColor(metric.metricKey, metric.value);

  // Calculate stats from history
  const stats = metric.history && metric.history.length > 0
    ? (() => {
        const values = metric.history!.map((h) => h.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const latest = metric.value;
        const deviation = latest - avg;
        const deviationPercent = avg !== 0 ? (deviation / avg) * 100 : 0;
        return {
          min,
          max,
          avg,
          latest,
          deviation,
          deviationPercent,
          dataPoints: metric.history!.length,
        };
      })()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 12, scale: 0.97  }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "#212529" }}>
              {metric.label}
            </h3>
            <p className="text-sm" style={{ color: "#868E96" }}>
              {metric.unit && `Unit: ${metric.unit}`}
              {thresholdDef && ` • Warning: ${thresholdDef.warn} • Critical: ${thresholdDef.critical}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: "#495057" }} />
          </button>
        </div>

        {/* Chart — grid renders instantly, then line flows left-to-right via Recharts */}
        <div className="p-4">
          {metric.history && metric.history.length > 0 ? (
            <MetricChart
              data={metric.history}
              metricKey={metric.metricKey}
              unit={metric.unit}
              color={chartColor}
              warningThreshold={thresholdDef?.warn}
              criticalThreshold={thresholdDef?.critical}
              invertThresholds={thresholdDef?.invert}
              mode="full"
              height={300}
              showThresholds={true}
            />
          ) : (
            <div className="h-75 flex items-center justify-center" style={{ color: "#868E96" }}>
              No historical data available
            </div>
          )}
        </div>

        {/* Stats — staggered with Framer Motion */}
        {stats && (
          <motion.div
            className="px-4 pb-4 space-y-3"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
              className="rounded-lg p-4 flex items-center justify-between"
              style={{
                background: stats.deviation >= 0 ? "#ECFDF5" : "#FEF2F2",
                border: `1px solid ${stats.deviation >= 0 ? "#A7F3D0" : "#FECACA"}`,
              }}
            >
              <div>
                <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Current vs Average
                </div>
                <div className="text-sm mt-1" style={{ color: "#374151" }}>
                  Current: <span className="font-semibold">{stats.latest.toFixed(2)}</span> | Average: <span className="font-semibold">{stats.avg.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: stats.deviation >= 0 ? "#059669" : "#DC2626" }}>
                  {stats.deviation >= 0 ? "+" : ""}{stats.deviationPercent.toFixed(1)}%
                </div>
                <div className="text-xs" style={{ color: stats.deviation >= 0 ? "#059669" : "#DC2626" }}>
                  {stats.deviation >= 0 ? "+" : ""}{stats.deviation.toFixed(2)} from avg
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Min",         value: stats.min.toFixed(2),     bg: "#F8F9FA", color: "#868E96",               textColor: "#495057" },
                { label: "Max",         value: stats.max.toFixed(2),     bg: "#F8F9FA", color: "#868E96",               textColor: "#495057" },
                { label: "Average",     value: stats.avg.toFixed(2),     bg: "#6366F1", color: "rgba(255,255,255,0.8)", textColor: "#fff"    },
                { label: "Data Points", value: String(stats.dataPoints), bg: "#F8F9FA", color: "#868E96",               textColor: "#495057" },
              ].map((tile) => (
                <motion.div
                  key={tile.label}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }}
                  className="rounded-lg p-3 text-center"
                  style={{ background: tile.bg }}
                >
                  <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: tile.color }}>
                    {tile.label}
                  </div>
                  <div className="text-lg font-bold" style={{ color: tile.textColor }}>
                    {tile.value}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Metrics selector dropdown
// ---------------------------------------------------------------------------

interface MetricsSelectorProps {
  available: AvailableMetric[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

function MetricsSelector({ available, selected, onChange }: MetricsSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(metric: string) {
    const next = new Set(selected);
    if (next.has(metric)) {
      next.delete(metric);
    } else {
      next.add(metric);
    }
    onChange(next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium"
        style={{ background: "#F8F9FA", border: "1px solid #DEE2E6", color: "#495057" }}
      >
        <span>Metrics ({selected.size})</span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "#868E96" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 rounded-lg overflow-hidden"
          style={{
            background: "#fff",
            border: "1px solid #DEE2E6",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            width: 300,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {available.map((m) => {
            const checked = selected.has(m.metric);
            return (
              <button
                key={m.metric}
                onClick={() => toggle(m.metric)}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div
                  className="mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center"
                  style={{
                    border: checked ? "none" : "1.5px solid #ADB5BD",
                    background: checked ? "#228BE6" : "transparent",
                  }}
                >
                  {checked && <Check className="w-2.5 h-2.5" style={{ color: "#fff" }} />}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: "#212529" }}>
                    {formatMetricLabel(m.metric)}
                  </div>
                  {m.unit && (
                    <div className="text-[10px]" style={{ color: "#868E96" }}>
                      {m.unit}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HealthDashboard({ data }: HealthDashboardProps) {
  const vitals = data.vitals || {};
  const locks = data.locks || [];
  const suggestions = data.suggestions || [];
  const availableMetrics = data.available_metrics || [];
  const metricsHistory = data.metrics_history || [];
  const defaultMetrics = data.default_metrics || [
    "cpu_utilization",
    "disk_space_usage",
    "freeable_memory",
    "number_of_active_connections",
    "percentage_of_read_requests_served_by_the_buffer_cache",
    "number_of_transactions_per_second",
  ];

  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    () => new Set(defaultMetrics)
  );
  const [expandedMetric, setExpandedMetric] = useState<VitalMetric | null>(null);

  const timestamp = data.timestamp
    ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  // Use real metrics history only (no mock data in production)
  const effectiveMetricsHistory = metricsHistory;

  // Group metrics history by metric name
  // Handles two formats:
  // 1. Raw format: [{ts, value, metric, ...}, ...] - each entry has one metric
  // 2. Grouped format: [{ts, metric1: value1, metric2: value2, ...}, ...] - each entry has multiple metrics
  const historyByMetric: Record<string, MetricDataPoint[]> = {};

  effectiveMetricsHistory.forEach((item) => {
    if (item.metric && item.value !== undefined) {
      // Raw format: single metric per entry
      if (!historyByMetric[item.metric]) {
        historyByMetric[item.metric] = [];
      }
      historyByMetric[item.metric].push({
        ts: item.ts,
        value: item.value,
        resource_id: item.resource_id,
        resource_name: item.resource_name,
        metric: item.metric,
        unit: item.unit,
      });
    } else if (item.ts) {
      // Grouped format: multiple metrics per entry (keyed by metric name)
      Object.entries(item).forEach(([key, value]) => {
        if (key !== "ts" && typeof value === "number") {
          if (!historyByMetric[key]) {
            historyByMetric[key] = [];
          }
          historyByMetric[key].push({
            ts: item.ts,
            value: value as number,
            metric: key,
          });
        }
      });
    }
  });

  // Build metric cards from available metrics list filtered by selection,
  // looking up actual values from vitals (0 if not returned by API)
  const metricsSource = availableMetrics.length > 0
    ? availableMetrics
    : defaultMetrics.map((m) => ({ metric: m, unit: "", description: "" }));

  const metrics: VitalMetric[] = metricsSource
    .filter((m) => selectedMetrics.has(m.metric))
    .map((m) => {
      const history = historyByMetric[m.metric] || [];
      // Use the latest value from history if available, otherwise fall back to vitals
      const latestFromHistory = history.length > 0
        ? [...history].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0].value
        : undefined;
      return {
        label: formatMetricLabel(m.metric),
        metricKey: m.metric,
        value: latestFromHistory ?? vitals[m.metric] ?? 0,
        unit: m.unit || "",
        history: history.length > 0 ? history : undefined,
      };
    });

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
            <Activity className="w-4 h-4" style={{ color: "#2563EB" }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "#1A1E2E" }}>
            Database Vitals
          </h3>
          {(data.database_name || data.resource_id) && (
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded-md"
              style={{ background: "#E7F5FF", color: "#1971C2", border: "1px solid #D0EBFF" }}
            >
              {data.database_name || data.resource_id}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timestamp && (
            <span className="text-[11px]" style={{ color: "#ADB5BD" }}>
              as of {timestamp}
            </span>
          )}
          {availableMetrics.length > 0 && (
            <MetricsSelector
              available={availableMetrics}
              selected={selectedMetrics}
              onChange={setSelectedMetrics}
            />
          )}
        </div>
      </div>

      {/* Vitals Grid */}
      {metrics.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((metric, i) => (
            <VitalCard
              key={metric.metricKey}
              metric={metric}
              index={i}
              onClick={() => setExpandedMetric(metric)}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-center py-4" style={{ color: "#868E96" }}>
          No metrics selected. Use the dropdown above to choose metrics.
        </div>
      )}

      {/* Expanded Chart Modal */}
      <AnimatePresence>
        {expandedMetric && (
          <ExpandedChart
            metric={expandedMetric}
            onClose={() => setExpandedMetric(null)}
          />
        )}
      </AnimatePresence>

      {/* Lock & Wait Events */}
      {locks.length > 0 && (() => {
        const lockStateCounts = locks.reduce((acc, l) => {
          acc[l.state] = (acc[l.state] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        return (
        <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                <Lock className="w-4 h-4" style={{ color: "#D97706" }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#1A1E2E" }}>
                Lock & Wait Events
              </span>
              {Object.entries(lockStateCounts).map(([state, count]) => {
                const s = STATE_COLORS[state] || STATE_COLORS.IDLE;
                return (
                  <span
                    key={state}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: s.bg, color: s.text }}
                  >
                    {count} {state}
                  </span>
                );
              })}
            </div>
            <span className="text-[11px]" style={{ color: "#ADB5BD" }}>
              {locks.length} active process{locks.length !== 1 ? "es" : ""}
            </span>
          </div>
          <div className="overflow-hidden" style={{ borderTop: "1px solid #E9ECEF" }}>
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
                      <td className="px-3 py-2 font-mono truncate max-w-50" style={{ color: "#495057" }}>{lock.query}</td>
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
        );
      })()}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                <Lightbulb className="w-4 h-4" style={{ color: "#D97706" }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#1A1E2E" }}>
                Suggestions
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FFF3CD", color: "#856404" }}
              >
                {suggestions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              {(["CRITICAL", "HIGH", "MEDIUM"] as const).map((sev) => {
                const count = suggestions.filter((s) => s.severity === sev).length;
                if (!count) return null;
                const s = SEVERITY_STYLES[sev];
                return (
                  <span key={sev} className="px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.border }}>
                    {count} {sev}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            {suggestions.map((suggestion, i) => {
              const style = SEVERITY_STYLES[suggestion.severity] || SEVERITY_STYLES.MEDIUM;
              const SevIcon =
                suggestion.severity === "CRITICAL" ? AlertCircle :
                suggestion.severity === "HIGH"     ? AlertTriangle :
                                                     Lightbulb;
              return (
                <div
                  key={i}
                  className="rounded-r-lg px-4 py-3"
                  style={{ background: style.bg, borderLeft: `4px solid ${style.border}` }}
                >
                  <div className="flex items-start gap-3">
                    <SevIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: style.border }} />
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded mr-2 inline-block mb-1"
                        style={{
                          background: style.badgeBg,
                          color: style.badgeText,
                          border: `1px solid ${style.border}`,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {suggestion.severity}
                      </span>
                      <span className="text-[13px] leading-relaxed" style={{ color: "#1A1E2E" }}>
                        <SuggestionText text={suggestion.message} />
                      </span>
                    </div>
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
