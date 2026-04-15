import { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export interface MetricDataPoint {
  ts: string;
  value: number;
  resource_id?: string;
  resource_name?: string;
  metric?: string;
  unit?: string;
}

interface MetricChartProps {
  data: MetricDataPoint[];
  metricKey: string;
  unit: string;
  color?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  invertThresholds?: boolean;
  mode?: "sparkline" | "full";
  height?: number;
  showThresholds?: boolean;
}

// Format timestamp for display
function formatTime(ts: string, mode: "sparkline" | "full"): string {
  const date = new Date(ts);
  if (mode === "sparkline") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format value for tooltip
function formatValue(value: number, unit: string): string {
  if (unit === "percentage" || unit === "%") {
    return `${value.toFixed(2)}%`;
  }
  if (unit === "MB" || unit === "Bytes") {
    return `${value.toFixed(2)} ${unit}`;
  }
  if (unit === "ms" || unit === "sec") {
    return `${value.toFixed(2)} ${unit}`;
  }
  if (unit.includes("/sec") || unit.includes("/s")) {
    return `${value.toFixed(2)} ${unit}`;
  }
  if (unit === "count") {
    return value.toFixed(0);
  }
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
}

// Determine chart type based on metric characteristics
function getChartType(metricKey: string): "line" | "area" {
  // Area charts for cumulative/usage metrics
  const areaMetrics = [
    "memory",
    "storage",
    "buffer",
    "disk_space",
    "cache",
    "allocation",
  ];
  if (areaMetrics.some((m) => metricKey.toLowerCase().includes(m))) {
    return "area";
  }
  // Everything else uses line
  return "line";
}

// Custom tooltip component with deviation from average
function CustomTooltip({
  active,
  payload,
  label,
  unit,
  average,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
  average?: number;
}) {
  if (active && payload && payload.length && label) {
    const value = payload[0].value;
    const deviation = average !== undefined ? value - average : 0;
    const deviationPercent = average !== undefined && average !== 0
      ? ((deviation / average) * 100).toFixed(1)
      : "0";
    const isPositive = deviation >= 0;

    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #E9ECEF",
          borderRadius: 8,
          padding: "10px 14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          minWidth: 160,
        }}
      >
        <p style={{ margin: 0, fontSize: 11, color: "#868E96", marginBottom: 6 }}>
          {formatTime(label, "full")}
        </p>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#212529" }}>
          {formatValue(value, unit)}
        </p>
        {average !== undefined && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E9ECEF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: "#868E96" }}>Avg:</span>
              <span style={{ color: "#495057", fontWeight: 500 }}>{formatValue(average, unit)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "#868E96" }}>From Avg:</span>
              <span style={{
                color: isPositive ? "#10B981" : "#EF4444",
                fontWeight: 600
              }}>
                {isPositive ? "+" : ""}{deviationPercent}% ({isPositive ? "+" : ""}{deviation.toFixed(2)})
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function MetricChart({
  data,
  metricKey,
  unit,
  color = "#228BE6",
  warningThreshold,
  criticalThreshold,
  mode = "full",
  height = 200,
  showThresholds = true,
}: MetricChartProps) {
  // Transform and sort data by timestamp
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data]
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      .map((d) => ({
        ...d,
        timestamp: d.ts,
        displayTime: formatTime(d.ts, mode),
      }));
  }, [data, mode]);

  // Calculate min/max/avg for Y axis with padding
  const { minValue, maxValue, avgValue } = useMemo(() => {
    if (chartData.length === 0) return { minValue: 0, maxValue: 100, avgValue: 50 };
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const padding = (max - min) * 0.15 || max * 0.15 || 10;
    return {
      minValue: Math.max(0, min - padding),
      maxValue: max + padding,
      avgValue: avg,
    };
  }, [chartData]);

  const chartType = getChartType(metricKey);

  if (chartData.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#868E96",
          fontSize: 12,
        }}
      >
        No data available
      </div>
    );
  }

  // Sparkline mode - minimal chart for cards
  if (mode === "sparkline") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        {chartType === "area" ? (
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#gradient-${metricKey})`}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    );
  }

  // Full mode - detailed chart with axes and tooltips
  return (
    <ResponsiveContainer width="100%" height={height}>
      {chartType === "area" ? (
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-full-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis
            dataKey="displayTime"
            tick={{ fontSize: 10, fill: "#868E96" }}
            tickLine={{ stroke: "#E9ECEF" }}
            axisLine={{ stroke: "#E9ECEF" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minValue, maxValue]}
            tick={{ fontSize: 10, fill: "#868E96" }}
            tickLine={{ stroke: "#E9ECEF" }}
            axisLine={{ stroke: "#E9ECEF" }}
            tickFormatter={(v) => formatValue(v, unit).split(" ")[0]}
            width={50}
          />
          <Tooltip content={<CustomTooltip unit={unit} average={avgValue} />} />
          {/* Average reference line */}
          <ReferenceLine
            y={avgValue}
            stroke="#6366F1"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: `Avg: ${avgValue.toFixed(1)}`, position: "right", fontSize: 10, fill: "#6366F1" }}
          />
          {showThresholds && warningThreshold !== undefined && (
            <ReferenceLine
              y={warningThreshold}
              stroke="#FFC107"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}
          {showThresholds && criticalThreshold !== undefined && (
            <ReferenceLine
              y={criticalThreshold}
              stroke="#DC3545"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-full-${metricKey})`}
            dot={{ fill: color, strokeWidth: 0, r: 2 }}
            activeDot={{ fill: color, strokeWidth: 2, stroke: "#fff", r: 5 }}
            isAnimationActive={true}
            animationBegin={150}
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      ) : (
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis
            dataKey="displayTime"
            tick={{ fontSize: 10, fill: "#868E96" }}
            tickLine={{ stroke: "#E9ECEF" }}
            axisLine={{ stroke: "#E9ECEF" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minValue, maxValue]}
            tick={{ fontSize: 10, fill: "#868E96" }}
            tickLine={{ stroke: "#E9ECEF" }}
            axisLine={{ stroke: "#E9ECEF" }}
            tickFormatter={(v) => formatValue(v, unit).split(" ")[0]}
            width={50}
          />
          <Tooltip content={<CustomTooltip unit={unit} average={avgValue} />} />
          {/* Average reference line */}
          <ReferenceLine
            y={avgValue}
            stroke="#6366F1"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: `Avg: ${avgValue.toFixed(1)}`, position: "right", fontSize: 10, fill: "#6366F1" }}
          />
          {showThresholds && warningThreshold !== undefined && (
            <ReferenceLine
              y={warningThreshold}
              stroke="#FFC107"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}
          {showThresholds && criticalThreshold !== undefined && (
            <ReferenceLine
              y={criticalThreshold}
              stroke="#DC3545"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 0, r: 2 }}
            activeDot={{ fill: color, strokeWidth: 2, stroke: "#fff", r: 5 }}
            isAnimationActive={true}
            animationBegin={150}
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
