import { BarChart3, Database, Clock, Zap, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import SyntaxHighlighter from '@/components/ui/SyntaxHighlighter';

// Type definitions for execution plans
interface PostgresPlan {
  metadata: {
    query: string;
    timestamp: string;
    connection_endpoint: string;
  };
  execution_plan: {
    json: Array<{
      Plan: {
        'Node Type': string;
        'Relation Name'?: string;
        'Startup Cost': number;
        'Total Cost': number;
        'Plan Rows': number;
        'Actual Total Time'?: number;
        'Actual Rows'?: number;
        Output?: string[];
        Filter?: string;
        'Rows Removed by Filter'?: number;
      };
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
        cost_info: {
          query_cost: string;
        };
        nested_loop?: Array<{
          table: {
            table_name: string;
            access_type: string;
            possible_keys?: string[];
            key?: string;
            rows_examined_per_scan: number;
            cost_info: {
              read_cost: string;
              eval_cost: string;
              prefix_cost: string;
            };
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

// Database type detection
const detectDatabaseType = (data: ExecutionPlanData): 'postgresql' | 'mysql' | 'mongodb' | 'unknown' => {
  if (data.metadata?.connection_endpoint?.includes('postgres')) return 'postgresql';
  if (data.metadata?.connection_endpoint?.includes('mysql')) return 'mysql';
  if (data.metadata?.connection_endpoint?.includes('mongo')) return 'mongodb';
  
  // Fallback detection based on structure
  if ('json' in data.execution_plan && Array.isArray(data.execution_plan.json) && data.execution_plan.json[0]?.Plan) return 'postgresql';
  if ('json' in data.execution_plan && 'query_block' in data.execution_plan.json) return 'mysql';
  if ('collection' in data.execution_plan) return 'mongodb';
  
  return 'unknown';
};

// Performance indicator utility
const getPerformanceIndicator = (cost: number | string, threshold: { good: number; fair: number }) => {
  const numericCost = typeof cost === 'string' ? parseFloat(cost) || 0 : cost;
  if (numericCost <= threshold.good) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Good' };
  if (numericCost <= threshold.fair) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair' };
  return { color: 'text-red-600', bg: 'bg-red-100', label: 'Poor' };
};

interface ExecutionPlanVisualizationProps {
  data: ExecutionPlanData;
  onClose?: () => void;
}

export default function ExecutionPlanVisualization({ data, onClose }: ExecutionPlanVisualizationProps) {
  const dbType = detectDatabaseType(data);

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle>Query Execution Plan</CardTitle>
            <Badge variant="outline">
              {dbType.toUpperCase()}
            </Badge>
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Query Display */}
        <div className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">Query:</div>
          <Card>
            <CardContent className="p-3">
              <code className="text-sm font-mono">
                {data.metadata.query}
              </code>
            </CardContent>
          </Card>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="visual" className="w-full">
          <TabsList>
            <TabsTrigger value="visual" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-2">
              <Info className="w-4 h-4" />
              Raw Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="min-h-[300px] mt-4">
            {dbType === 'postgresql' && <PostgreSQLVisualization data={data as PostgresPlan} />}
            {dbType === 'mysql' && <MySQLVisualization data={data as MySQLPlan} />}
            {dbType === 'mongodb' && <MongoDBVisualization data={data as MongoDBPlan} />}
            {dbType === 'unknown' && (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>Unable to detect database type for visualization</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="raw" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <SyntaxHighlighter
                  code={'text' in data.execution_plan ? data.execution_plan.text : JSON.stringify(data.execution_plan, null, 2)}
                  language={'text' in data.execution_plan ? 'sql' : 'json'}
                  showCopyButton={true}
                  className="max-h-96 overflow-auto"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// PostgreSQL Visualization Component
function PostgreSQLVisualization({ data }: { data: PostgresPlan }) {
  const plan = data.execution_plan.json[0];
  const costIndicator = getPerformanceIndicator(data.cost, { good: 1, fair: 10 });
  const timeIndicator = getPerformanceIndicator(data.execution_time, { good: 1, fair: 100 });

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <div className="text-lg font-bold">{data.cost}</div>
            <Badge variant={costIndicator.label === 'Good' ? 'default' : costIndicator.label === 'Fair' ? 'secondary' : 'destructive'} className="text-xs">
              {costIndicator.label}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Execution Time</span>
            </div>
            <div className="text-lg font-bold">{data.execution_time}ms</div>
            <Badge variant={timeIndicator.label === 'Good' ? 'default' : timeIndicator.label === 'Fair' ? 'secondary' : 'destructive'} className="text-xs">
              {timeIndicator.label}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Rows</span>
            </div>
            <div className="text-lg font-bold">{data.rows}</div>
            <div className="text-xs text-muted-foreground">Estimated</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Planning</span>
            </div>
            <div className="text-lg font-bold">{data.planning_time}ms</div>
            <div className="text-xs text-muted-foreground">Planning Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Plan Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <PlanNode node={plan.Plan} level={0} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Plan Node Component for PostgreSQL tree  
interface PlanNodeType {
  'Node Type': string;
  'Relation Name'?: string;
  'Startup Cost': number;
  'Total Cost': number;
  'Plan Rows': number;
  'Actual Total Time'?: number;
  Filter?: string;
}

function PlanNode({ node, level }: { node: PlanNodeType; level: number }) {
  const indent = level * 20;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: level * 0.1 }}
      style={{ marginLeft: `${indent}px` }}
    >
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{node['Node Type']}</div>
              {node['Relation Name'] && (
                <div className="text-sm text-muted-foreground">Table: {node['Relation Name']}</div>
              )}
              {node.Filter && (
                <div className="text-sm text-muted-foreground">Filter: {node.Filter}</div>
              )}
            </div>
            <div className="text-right text-sm">
              <div>Cost: {node['Startup Cost']} → {node['Total Cost']}</div>
              <div className="text-muted-foreground">Rows: {node['Plan Rows']}</div>
              {node['Actual Total Time'] && (
                <div className="text-muted-foreground">Time: {node['Actual Total Time']}ms</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// MySQL Visualization Component
function MySQLVisualization({ data }: { data: MySQLPlan }) {
  const queryBlock = data.execution_plan.json.query_block;
  const totalCost = parseFloat(queryBlock.cost_info.query_cost);
  const costIndicator = getPerformanceIndicator(totalCost, { good: 1, fair: 5 });

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Query Cost</span>
            </div>
            <div className="text-lg font-bold">{queryBlock.cost_info.query_cost}</div>
            <Badge variant={costIndicator.label === 'Good' ? 'default' : costIndicator.label === 'Fair' ? 'secondary' : 'destructive'} className="text-xs">
              {costIndicator.label}
            </Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Tables</span>
            </div>
            <div className="text-lg font-bold">{queryBlock.nested_loop?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Joined</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Analysis</span>
            </div>
            <div className="text-sm">{data.analyzed ? 'Analyzed' : 'Plan Only'}</div>
            <div className="text-xs text-muted-foreground">{data.note}</div>
          </CardContent>
        </Card>
      </div>

      {/* Join Flow */}
      {queryBlock.nested_loop && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Table Access & Join Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queryBlock.nested_loop.map((item, index) => (
                <TableNode key={index} table={item.table} step={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Table Node Component for MySQL
interface TableNodeType {
  table_name: string;
  access_type: string;
  key?: string;
  rows_examined_per_scan: number;
  cost_info: {
    read_cost: string;
  };
}

function TableNode({ table, step }: { table: TableNodeType; step: number }) {
  const accessTypeColors: Record<string, string> = {
    'ALL': 'text-red-600',
    'eq_ref': 'text-green-600',
    'ref': 'text-blue-600',
    'range': 'text-yellow-600'
  };
  const accessTypeColor = accessTypeColors[table.access_type] || 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.1 }}
    >
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Step {step}: {table.table_name}</div>
              <Badge variant="outline" className={`text-xs ${accessTypeColor}`}>
                {table.access_type}
              </Badge>
              {table.key && (
                <div className="text-sm text-muted-foreground mt-1">Using key: {table.key}</div>
              )}
            </div>
            <div className="text-right text-sm">
              <div>Rows: {table.rows_examined_per_scan}</div>
              <div className="text-muted-foreground">
                Cost: {table.cost_info.read_cost}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// MongoDB Visualization Component
function MongoDBVisualization({ data }: { data: MongoDBPlan }) {
  const stats = data.execution_plan.stats;

  return (
    <div className="space-y-4">
      {/* Collection Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Documents</span>
            </div>
            <div className="text-lg font-bold">{stats.document_count.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Count</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Collection Size</span>
            </div>
            <div className="text-lg font-bold">{(stats.collection_size / 1024).toFixed(1)}KB</div>
            <div className="text-xs text-muted-foreground">Storage</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Avg Doc Size</span>
            </div>
            <div className="text-lg font-bold">{stats.avg_doc_size}B</div>
            <div className="text-xs text-muted-foreground">Per Document</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Indexes</span>
            </div>
            <div className="text-lg font-bold">{stats.index_count}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </CardContent>
        </Card>
      </div>

      {/* Query Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Query Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Collection:</span>
              <Badge variant="outline">{data.execution_plan.collection}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Operation:</span>
              <Badge variant="secondary" className="font-mono">{data.execution_plan.operation}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Database:</span>
              <Badge variant="outline">{data.database}</Badge>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              {data.note}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}