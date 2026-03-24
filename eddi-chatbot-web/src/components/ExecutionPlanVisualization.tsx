import { useState } from 'react';
import { BarChart3, Clock, Database, Zap, Layers, Table2, FileCode } from 'lucide-react';
import SyntaxHighlighter from '@/components/ui/SyntaxHighlighter';

// Type definitions
interface PostgresPlan {
  metadata: {
    query: string;
    timestamp: string;
    connection_endpoint: string;
  };
  execution_plan: {
    json: Array<{
      Plan: PlanNodeType & { Plans?: PlanNodeType[] };
      'Planning Time': number;
      'Execution Time': number;
    }>;
    text: string;
  };
  analyzed: boolean;
  cost: number;
  rows: number;
  execution_time: number;
  planning_time: number;
}

interface MySQLPlan {
  metadata: {
    query: string;
    timestamp: string;
    connection_endpoint: string;
  };
  execution_plan: {
    json: {
      query_block: {
        select_id: number;
        cost_info: { query_cost: string };
        nested_loop?: Array<{
          table: {
            table_name: string;
            access_type: string;
            possible_keys?: string[];
            key?: string;
            rows_examined_per_scan: number;
            cost_info: { read_cost: string; eval_cost: string; prefix_cost: string };
          };
        }>;
      };
    };
    text: string;
  };
  analyzed: boolean;
  cost: string;
  rows: string;
  note: string;
}

interface MongoDBPlan {
  metadata: {
    query: string;
    timestamp: string;
    connection_endpoint: string;
  };
  execution_plan: {
    query: string;
    collection: string;
    operation: string;
    stats: {
      collection_size: number;
      document_count: number;
      avg_doc_size: number;
      index_count: number;
    };
  };
  analyzed: boolean;
  database: string;
  note: string;
}

type ExecutionPlanData = PostgresPlan | MySQLPlan | MongoDBPlan;

interface PlanNodeType {
  'Node Type': string;
  'Relation Name'?: string;
  'Startup Cost': number;
  'Total Cost': number;
  'Plan Rows': number;
  'Actual Total Time'?: number;
  'Actual Rows'?: number;
  Output?: string[];
  Filter?: string;
  'Sort Key'?: string[];
  'Hash Cond'?: string;
  'Rows Removed by Filter'?: number;
  Plans?: PlanNodeType[];
}

const detectDatabaseType = (data: ExecutionPlanData): 'postgresql' | 'mysql' | 'mongodb' | 'unknown' => {
  if (data.metadata?.connection_endpoint?.includes('postgres')) return 'postgresql';
  if (data.metadata?.connection_endpoint?.includes('mysql')) return 'mysql';
  if (data.metadata?.connection_endpoint?.includes('mongo')) return 'mongodb';
  if ('json' in data.execution_plan && Array.isArray(data.execution_plan.json) && data.execution_plan.json[0]?.Plan) return 'postgresql';
  if ('json' in data.execution_plan && 'query_block' in data.execution_plan.json) return 'mysql';
  if ('collection' in data.execution_plan) return 'mongodb';
  return 'unknown';
};

function getColor(value: number, good: number, fair: number) {
  if (value <= good) return { text: "#28A745", label: "Good" };
  if (value <= fair) return { text: "#E8A800", label: "Fair" };
  return { text: "#DC3545", label: "Slow" };
}

const DB_LABELS: Record<string, string> = {
  postgresql: "POSTGRESQL",
  mysql: "MYSQL",
  mongodb: "MONGODB",
  unknown: "DATABASE",
};

interface ExecutionPlanVisualizationProps {
  data: ExecutionPlanData;
  onClose?: () => void;
}

export default function ExecutionPlanVisualization({ data }: ExecutionPlanVisualizationProps) {
  const [tab, setTab] = useState<'visual' | 'raw'>('visual');
  const dbType = detectDatabaseType(data);

  return (
    <div className="p-5 space-y-6">
      {/* Query */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4" style={{ color: "#495057" }} />
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#495057" }}>
              Query
            </h3>
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ background: "#E9ECEF", color: "#495057", letterSpacing: "0.05em" }}
            >
              {DB_LABELS[dbType]}
            </span>
          </div>
        </div>
        <div
          className="rounded-lg px-4 py-3 font-mono text-[12px] leading-relaxed overflow-x-auto"
          style={{ background: "#F8F9FA", border: "1px solid #E9ECEF", color: "#495057" }}
        >
          {data.metadata.query}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid #E9ECEF" }}>
        <button
          className="px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer"
          style={{
            color: tab === 'visual' ? "#008555" : "#868E96",
            borderBottom: tab === 'visual' ? "2px solid #008555" : "2px solid transparent",
          }}
          onClick={() => setTab('visual')}
        >
          Visual
        </button>
        <button
          className="px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer"
          style={{
            color: tab === 'raw' ? "#008555" : "#868E96",
            borderBottom: tab === 'raw' ? "2px solid #008555" : "2px solid transparent",
          }}
          onClick={() => setTab('raw')}
        >
          Raw Plan
        </button>
      </div>

      {/* Content */}
      {tab === 'visual' ? (
        <>
          {dbType === 'postgresql' && <PostgreSQLVisual data={data as PostgresPlan} />}
          {dbType === 'mysql' && <MySQLVisual data={data as MySQLPlan} />}
          {dbType === 'mongodb' && <MongoDBVisual data={data as MongoDBPlan} />}
        </>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #E9ECEF" }}
        >
          <SyntaxHighlighter
            code={'text' in data.execution_plan ? data.execution_plan.text : JSON.stringify(data.execution_plan, null, 2)}
            language={'text' in data.execution_plan ? 'sql' : 'json'}
            showCopyButton={true}
          />
        </div>
      )}
    </div>
  );
}

// --- Metric Card (reusable, matches HealthDashboard style) ---
function MetricCard({ label, value, unit, icon: Icon, color }: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "#fff", border: "1px solid #E9ECEF" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#868E96" }}>
          {label}
        </span>
        <Icon className="w-3.5 h-3.5" style={{ color: "#ADB5BD" }} />
      </div>
      <div className="text-xl font-bold" style={{ color: color || "#1A1E2E" }}>
        {value}{unit && <span className="text-sm font-medium ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

// --- PostgreSQL ---
function PostgreSQLVisual({ data }: { data: PostgresPlan }) {
  const plan = data.execution_plan.json[0];
  const costColor = getColor(data.cost, 1, 10);
  const timeColor = getColor(data.execution_time, 1, 100);

  return (
    <div className="space-y-6">
      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total Cost" value={data.cost} icon={Zap} color={costColor.text} />
        <MetricCard label="Execution" value={data.execution_time} unit="ms" icon={Clock} color={timeColor.text} />
        <MetricCard label="Rows" value={data.rows.toLocaleString()} icon={Layers} />
        <MetricCard label="Planning" value={data.planning_time} unit="ms" icon={Clock} />
      </div>

      {/* Plan tree */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold" style={{ color: "#495057" }}>
            Execution Plan Tree
          </span>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E9ECEF" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "#F8F9FA", borderBottom: "1px solid #E9ECEF" }}>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Operation</th>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Detail</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: "#495057" }}>Cost</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: "#495057" }}>Rows</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: "#495057" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              <PlanRows node={plan.Plan} depth={0} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PlanRows({ node, depth }: { node: PlanNodeType; depth: number }) {
  const detail = node['Relation Name']
    ? `on ${node['Relation Name']}`
    : node['Sort Key']
      ? `by ${node['Sort Key'].join(', ')}`
      : node['Hash Cond']
        ? node['Hash Cond']
        : node.Filter || '—';

  return (
    <>
      <tr style={{ borderBottom: "1px solid #F1F3F5" }}>
        <td className="px-3 py-2.5 font-medium" style={{ color: "#1A1E2E", paddingLeft: `${12 + depth * 20}px` }}>
          {depth > 0 && <span style={{ color: "#CED4DA" }}>└ </span>}
          {node['Node Type']}
        </td>
        <td className="px-3 py-2.5 font-mono truncate max-w-[200px]" style={{ color: "#868E96" }}>
          {detail}
        </td>
        <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#495057" }}>
          {node['Startup Cost']}→{node['Total Cost']}
        </td>
        <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#495057" }}>
          {node['Plan Rows']}
        </td>
        <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#495057" }}>
          {node['Actual Total Time'] != null ? `${node['Actual Total Time']}ms` : '—'}
        </td>
      </tr>
      {node.Plans?.map((child, i) => (
        <PlanRows key={i} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

// --- MySQL ---
function MySQLVisual({ data }: { data: MySQLPlan }) {
  const queryBlock = data.execution_plan.json.query_block;
  const totalCost = parseFloat(queryBlock.cost_info.query_cost);
  const costColor = getColor(totalCost, 1, 5);
  const tables = queryBlock.nested_loop || [];

  const ACCESS_COLORS: Record<string, { bg: string; text: string }> = {
    ALL: { bg: "#FEE8EA", text: "#DC3545" },
    eq_ref: { bg: "#D4EDDA", text: "#155724" },
    ref: { bg: "#D1ECF1", text: "#0C5460" },
    range: { bg: "#FFF3CD", text: "#856404" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Query Cost" value={queryBlock.cost_info.query_cost} icon={Zap} color={costColor.text} />
        <MetricCard label="Tables" value={tables.length} icon={Table2} />
        <MetricCard label="Status" value={data.analyzed ? 'Analyzed' : 'Plan Only'} icon={Database} />
      </div>

      {tables.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: "#495057" }}>
              Table Access & Join Flow
            </span>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E9ECEF" }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "#F8F9FA", borderBottom: "1px solid #E9ECEF" }}>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Step</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Table</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Access</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#495057" }}>Key</th>
                  <th className="text-right px-3 py-2 font-semibold" style={{ color: "#495057" }}>Rows</th>
                  <th className="text-right px-3 py-2 font-semibold" style={{ color: "#495057" }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((item, i) => {
                  const t = item.table;
                  const ac = ACCESS_COLORS[t.access_type] || { bg: "#E2E8F0", text: "#4A5568" };
                  return (
                    <tr key={i} style={{ borderBottom: i < tables.length - 1 ? "1px solid #F1F3F5" : undefined }}>
                      <td className="px-3 py-2.5 font-mono" style={{ color: "#495057" }}>{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium" style={{ color: "#1A1E2E" }}>{t.table_name}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{ background: ac.bg, color: ac.text }}
                        >
                          {t.access_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono" style={{ color: "#868E96" }}>{t.key || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#495057" }}>{t.rows_examined_per_scan}</td>
                      <td className="px-3 py-2.5 text-right font-mono" style={{ color: "#495057" }}>{t.cost_info.read_cost}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.note && (
        <div
          className="rounded-r-lg px-5 py-4"
          style={{ background: "#EFF6FF", borderLeft: "4px solid #3B82F6" }}
        >
          <span className="text-[13px] leading-relaxed" style={{ color: "#1A1E2E" }}>
            {data.note}
          </span>
        </div>
      )}
    </div>
  );
}

// --- MongoDB ---
function MongoDBVisual({ data }: { data: MongoDBPlan }) {
  const stats = data.execution_plan.stats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Documents" value={stats.document_count.toLocaleString()} icon={Layers} />
        <MetricCard label="Collection" value={`${(stats.collection_size / 1024).toFixed(1)}KB`} icon={Database} />
        <MetricCard label="Avg Doc" value={`${stats.avg_doc_size}B`} icon={BarChart3} />
        <MetricCard label="Indexes" value={stats.index_count} icon={Zap} />
      </div>

      {/* Query details table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold" style={{ color: "#495057" }}>
            Query Analysis
          </span>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E9ECEF" }}>
          <table className="w-full text-[12px]">
            <tbody>
              <tr style={{ borderBottom: "1px solid #F1F3F5" }}>
                <td className="px-3 py-2.5 font-medium" style={{ color: "#868E96", width: 120 }}>Collection</td>
                <td className="px-3 py-2.5 font-mono" style={{ color: "#1A1E2E" }}>{data.execution_plan.collection}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #F1F3F5" }}>
                <td className="px-3 py-2.5 font-medium" style={{ color: "#868E96" }}>Operation</td>
                <td className="px-3 py-2.5 font-mono" style={{ color: "#1A1E2E" }}>{data.execution_plan.operation}</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium" style={{ color: "#868E96" }}>Database</td>
                <td className="px-3 py-2.5 font-mono" style={{ color: "#1A1E2E" }}>{data.database}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {data.note && (
        <div
          className="rounded-r-lg px-5 py-4"
          style={{ background: "#EFF6FF", borderLeft: "4px solid #3B82F6" }}
        >
          <span className="text-[13px] leading-relaxed" style={{ color: "#1A1E2E" }}>
            {data.note}
          </span>
        </div>
      )}
    </div>
  );
}
