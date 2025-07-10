import { useState } from 'react';
import { Database, Table, FileText, Key, Hash, Calendar, Type, Info, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// Type definitions for schema objects
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface Table {
  name: string;
  columns: Column[];
  definition: string;
}

interface Index {
  name: string;
  keys?: Record<string, number>;
  unique?: boolean;
  sparse?: boolean;
  definition?: string;
}

interface Collection {
  name: string;
  document_count: number;
  sample_schema: Record<string, any>;
}

interface SchemaDefinitions {
  database_type: string;
  database_host_endpoint: string;
  definitions: {
    tables?: Table[];
    indexes?: Index[];
    collections?: Collection[];
    views?: any[];
    functions?: any[];
    procedures?: any[];
  };
}

// Copy button component
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      size="sm"
      variant="ghost"
      className="absolute top-3 right-3 h-9 w-9 opacity-0 group-hover:opacity-100 hover:bg-background/80 backdrop-blur-sm border border-border/50"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4 text-muted-foreground" />
      )}
    </Button>
  );
};

// Utility function to get type icon and color
const getTypeIcon = (type: string) => {
  const normalizedType = type.toLowerCase();
  
  if (normalizedType.includes('int') || normalizedType.includes('number')) {
    return { icon: Hash, color: 'text-blue-600', bg: 'bg-blue-100' };
  }
  if (normalizedType.includes('varchar') || normalizedType.includes('text') || normalizedType.includes('str')) {
    return { icon: Type, color: 'text-green-600', bg: 'bg-green-100' };
  }
  if (normalizedType.includes('date') || normalizedType.includes('time')) {
    return { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' };
  }
  if (normalizedType.includes('bool')) {
    return { icon: Info, color: 'text-orange-600', bg: 'bg-orange-100' };
  }
  
  return { icon: Type, color: 'text-gray-600', bg: 'bg-gray-100' };
};

interface SchemaDefinitionsVisualizationProps {
  data: SchemaDefinitions;
}

export default function SchemaDefinitionsVisualization({ data }: SchemaDefinitionsVisualizationProps) {
  const { definitions, database_type, database_host_endpoint } = data;
  
  // Get available object types
  const objectTypes = Object.keys(definitions).filter(key => 
    definitions[key as keyof typeof definitions] && 
    (definitions[key as keyof typeof definitions] as any[]).length > 0
  );

  return (
    <div className="w-full h-full p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Database className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Schema Definitions</h1>
            <p className="text-base text-muted-foreground mt-1">{database_host_endpoint}</p>
          </div>
          <Badge variant="outline" className="text-base px-3 py-1">{database_type}</Badge>
        </div>
      </div>

      <Tabs defaultValue={objectTypes[0]} className="w-full h-full">
        <TabsList className="grid w-full max-w-2xl h-12 p-1 bg-muted/50">
          {objectTypes.map((type) => (
            <TabsTrigger key={type} value={type} className="capitalize text-base font-medium px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <div className="flex items-center gap-3">
                {type === 'tables' && <Table className="w-5 h-5" />}
                {type === 'indexes' && <Key className="w-5 h-5" />}
                {type === 'collections' && <Database className="w-5 h-5" />}
                {type === 'views' && <FileText className="w-5 h-5" />}
                <span>{type}</span>
                <Badge variant="secondary" className="text-xs">
                  {(definitions[type as keyof typeof definitions] as any[])?.length || 0}
                </Badge>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tables Tab */}
        {definitions.tables && (
          <TabsContent value="tables" className="mt-8">
            <div className="grid gap-8">
              {definitions.tables.map((table, index) => (
                <TableVisualization key={index} table={table} />
              ))}
            </div>
          </TabsContent>
        )}

        {/* Collections Tab */}
        {definitions.collections && (
          <TabsContent value="collections" className="mt-8">
            <div className="grid gap-8">
              {definitions.collections.map((collection, index) => (
                <CollectionVisualization key={index} collection={collection} />
              ))}
            </div>
          </TabsContent>
        )}

        {/* Indexes Tab */}
        {definitions.indexes && (
          <TabsContent value="indexes" className="mt-8">
            <div className="grid gap-6">
              {definitions.indexes.map((index, idx) => (
                <IndexVisualization key={idx} index={index} />
              ))}
            </div>
          </TabsContent>
        )}

        {/* Views Tab */}
        {definitions.views && (
          <TabsContent value="views" className="mt-8">
            <div className="grid gap-8">
              {definitions.views.map((view, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-6">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <FileText className="w-6 h-6" />
                      {view.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="relative group">
                      <pre className="bg-muted p-6 rounded-lg overflow-x-auto text-base font-mono">
                        {view.definition}
                      </pre>
                      <CopyButton text={view.definition} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Table visualization component
function TableVisualization({ table }: { table: Table }) {
  const [showDefinition, setShowDefinition] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-4">
              <Table className="w-6 h-6" />
              {table.name.split('.').pop()}
            </CardTitle>
            <div className="flex gap-4">
              <Badge variant="outline" className="text-base px-3 py-1">{table.columns.length} columns</Badge>
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowDefinition(!showDefinition)}
                className="px-4 py-2"
              >
                {showDefinition ? 'Hide' : 'Show'} SQL
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Columns */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base text-muted-foreground uppercase tracking-wide">Columns</h4>
            <div className="grid gap-4">
              {table.columns.map((column, idx) => (
                <ColumnVisualization key={idx} column={column} />
              ))}
            </div>
          </div>

          {/* SQL Definition */}
          {showDefinition && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8"
            >
              <Separator className="mb-6" />
              <h4 className="font-semibold text-base text-muted-foreground uppercase tracking-wide mb-4">CREATE TABLE Statement</h4>
              <div className="relative group">
                <pre className="bg-muted p-6 rounded-lg overflow-x-auto text-base font-mono">
                  {table.definition}
                </pre>
                <CopyButton text={table.definition} />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Column visualization component
function ColumnVisualization({ column }: { column: Column }) {
  const typeInfo = getTypeIcon(column.type);
  const IconComponent = typeInfo.icon;

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-5">
        <div className={`p-3 rounded-md ${typeInfo.bg}`}>
          <IconComponent className={`w-5 h-5 ${typeInfo.color}`} />
        </div>
        <div className="space-y-2">
          <div className="font-semibold text-base">{column.name}</div>
          <Badge variant="outline" className="text-sm font-mono px-2 py-1">
            {column.type}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {!column.nullable && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            NOT NULL
          </Badge>
        )}
        {column.default && (
          <Badge variant="secondary" className="text-sm max-w-40 truncate px-3 py-1" title={`DEFAULT: ${column.default}`}>
            DEFAULT: {column.default}
          </Badge>
        )}
      </div>
    </div>
  );
}

// Collection visualization component (MongoDB)
function CollectionVisualization({ collection }: { collection: Collection }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-4">
              <Database className="w-6 h-6" />
              {collection.name.split('.').pop()}
            </CardTitle>
            <Badge variant="outline" className="text-base px-3 py-1">
              {collection.document_count.toLocaleString()} documents
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            <h4 className="font-semibold text-base text-muted-foreground uppercase tracking-wide">Sample Schema</h4>
            <div className="relative group">
              <pre className="bg-muted p-6 rounded-lg overflow-x-auto text-base font-mono max-h-96">
                {JSON.stringify(collection.sample_schema, null, 2)}
              </pre>
              <CopyButton text={JSON.stringify(collection.sample_schema, null, 2)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Index visualization component
function IndexVisualization({ index }: { index: Index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-4">
              <Key className="w-6 h-6" />
              {index.name.split('.').pop()}
            </CardTitle>
            <div className="flex items-center gap-3">
              {index.unique && (
                <Badge variant="default" className="text-sm px-3 py-1">
                  UNIQUE
                </Badge>
              )}
              {index.sparse && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  SPARSE
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-6">
          {index.keys && (
            <div className="space-y-4">
              <h4 className="font-semibold text-base text-muted-foreground uppercase tracking-wide">Index Keys</h4>
              <div className="grid gap-3">
                {Object.entries(index.keys).map(([field, direction]) => (
                  <div key={field} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <span className="font-semibold text-base">{field}</span>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {direction === 1 ? 'ASC' : 'DESC'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {index.definition && (
            <div className="space-y-4">
              <h4 className="font-semibold text-base text-muted-foreground uppercase tracking-wide">Definition</h4>
              <div className="relative group">
                <pre className="bg-muted p-6 rounded-lg overflow-x-auto text-base font-mono">
                  {index.definition}
                </pre>
                <CopyButton text={index.definition} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}