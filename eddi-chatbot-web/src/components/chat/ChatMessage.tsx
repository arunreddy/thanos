// src/components/ChatMessage.tsx (updated)
import { format } from "date-fns";
import { motion } from "framer-motion";
import { CustomForm, FeedbackType, FeedbackRequest } from "@/types";
import { useState } from "react";
import { API_URL } from "@/lib/config";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { maskSensitiveInfo, containsSensitiveInfo } from "@/utils/maskSensitiveInfo";
import { BarChart3, Database, Activity, Bot, Radio, Server, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SyntaxHighlighter from "@/components/ui/SyntaxHighlighter";
import type { ContextPanelData } from "./ContextPanel";
import MessageActions from "./MessageActions";
import FeedbackDialog from "./FeedbackDialog";
import { useAppContext } from "@/AppContext";

// Category badge config — must match ChatNew.tsx CATEGORIES
const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  "Recommend DB": { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: Database },
  "Provision DB":  { color: "#008555", bg: "#E6F4EF", border: "#B3D9CC", icon: Server },
  "Health":        { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", icon: Zap },
  "Kafka Assist":  { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: Radio },
};

// Parse [Category] prefix from user message — returns { category, text }
function parseCategoryPrefix(content: string): { category: string | null; text: string } {
  const match = content.match(/^\[([^\]]+)\]\s*/);
  if (match && CATEGORY_STYLES[match[1]]) {
    return { category: match[1], text: content.slice(match[0].length) };
  }
  return { category: null, text: content };
}

// Parse sources section from assistant content
// Returns { mainContent, sources: [{label, url}[]] }
const CONFLUENCE_BASE = "https://confluence.corp.internal.citizensbank.com";

function parseSourcesSection(text: string): { mainContent: string; sources: { label: string; url: string }[] } {
  // No `m` flag — `$` matches end of string, not end of line
  // No `?` on `[\s\S]*` — greedy so it captures ALL lines after "Sources:"
  const sourcesRegex = /\*?\*?Sources:?\*?\*?\s*\n([\s\S]+)$/i;
  const match = text.match(sourcesRegex);
  if (!match) return { mainContent: text, sources: [] };

  const mainContent = text.slice(0, match.index).trimEnd();
  const sourcesBlock = match[1];
  const sources: { label: string; url: string }[] = [];
  const linkRegex = /[-•*]?\s*\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRegex.exec(sourcesBlock)) !== null) {
    let url = m[2];
    // Relative Confluence paths — prepend the base URL
    if (url.startsWith('/')) {
      url = CONFLUENCE_BASE + url;
    }
    sources.push({ label: m[1], url });
  }
  // Fallback for plain text lines (no markdown link syntax)
  if (sources.length === 0) {
    const plainLinkRegex = /[-•*]?\s*(.+)/g;
    while ((m = plainLinkRegex.exec(sourcesBlock)) !== null) {
      const line = m[1].trim();
      if (line) sources.push({ label: line, url: '' });
    }
  }
  return { mainContent, sources };
}
const formatJSON = (text: string): string => {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
};

const isValidJSON = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

interface Button {
  title: string;
  payload: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  buttons?: Button[];
  customForm?: CustomForm;
  messageId?: string | number;
  activeCategory?: string | null;
  feedbackState?: FeedbackType | "none";
  onButtonClick?: (payload: string, title?: string) => void;
  onShowContext?: (context: ContextPanelData) => void;
  onFeedbackSubmit?: (messageId: string, data: FeedbackRequest) => void;
  onFeedbackRemove?: (messageId: string) => void;
  onRetry?: () => void;
}

function ActionCard({
  icon: Icon,
  label,
  subtitle,
  onClick,
  href,
}: {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors"
      style={{
        background: "#F8F9FA",
        border: "1px solid #E9ECEF",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#F1F3F5";
        e.currentTarget.style.borderColor = "#DEE2E6";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#F8F9FA";
        e.currentTarget.style.borderColor = "#E9ECEF";
      }}
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "#E9ECEF", color: "#495057" }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: "#1A1E2E" }}>
          {label}
        </div>
        {subtitle && (
          <div className="text-[11px] truncate" style={{ color: "#868E96" }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="text-[12px] font-medium shrink-0" style={{ color: "#868E96" }}>
        Open
      </div>
    </div>
  );

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" download>{content}</a>;
  }
  return content;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  buttons = [],
  customForm,
  messageId,
  feedbackState = "none",
  activeCategory = null,
  onButtonClick,
  onShowContext,
  onFeedbackSubmit,
  onFeedbackRemove,
  onRetry,
}: ChatMessageProps) {
  const isUser = role === "user";
  const hasSensitiveInfo = containsSensitiveInfo(content);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackDialogType, setFeedbackDialogType] = useState<FeedbackType>("positive");
  const { user } = useAppContext();

  // Parse category prefix from user messages e.g. "[Kafka Assist] How do I..."
  const { text: cleanContent } = isUser ? parseCategoryPrefix(content) : { text: content };

  // User avatar initials
  const userInitials = user
    ? `${user.given_name?.[0] ?? ""}${user.family_name?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  // Parse category accent color
  const accentColor = activeCategory ? (CATEGORY_STYLES[activeCategory]?.color ?? "#1A1E2E") : "#1A1E2E";

  // Parse sources out of assistant content
  const { mainContent, sources } = !isUser ? parseSourcesSection(cleanContent) : { mainContent: cleanContent, sources: [] };

  // Whether this message has a real backend ID (not a local numeric or welcome message ID)
  const hasBackendId = typeof messageId === "string" && messageId.length > 10;

  const handleFeedbackClick = (type: FeedbackType) => {
    if (!hasBackendId) return;
    if (feedbackState === type) {
      onFeedbackRemove?.(messageId as string);
      return;
    }
    setFeedbackDialogType(type);
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackDialogSubmit = (data: FeedbackRequest) => {
    if (hasBackendId) {
      onFeedbackSubmit?.(messageId as string, data);
    }
  };
  
  const isExecutionPlan = customForm?.objects && 
    (customForm.objects.metadata || customForm.objects.execution_plan || 
     (customForm.objects.analyzed !== undefined && customForm.objects.cost !== undefined));
  
  const isSchemaDefinitions = customForm?.objects && 
    customForm.objects.definitions && 
    customForm.objects.database_type;
  
  const [showSensitive, setShowSensitive] = useState(() => {
    if (!hasSensitiveInfo) return false;
    try {
      const stored = sessionStorage.getItem('showSensitiveInfo');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const toggleSensitive = () => {
    const newValue = !showSensitive;
    setShowSensitive(newValue);
    try {
      sessionStorage.setItem('showSensitiveInfo', newValue.toString());
    } catch { /* storage access may fail in private browsing */ }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  const formatContent = (role: string, text: string) => {
    let formattedText = text;

    if (text.startsWith("/")) {
      formattedText = text.replace("/", "");
    }
    
    console.log("Formatted Text: ", formattedText);

    if (role == "assistant" && formattedText.includes("{")) {
      try {
        const [, json] = formattedText.split("{");
        const jsonString = "{" + json;
        const parsedJson = JSON.parse(jsonString);
        const firstKey = Object.keys(parsedJson)[0];
        const firstValue = parsedJson[firstKey];
        formattedText = `${firstValue}`;
      } catch (error) {
        console.error("Failed to parse JSON from message content:", error);
      }
    } 

    formattedText = formattedText.replace(/```json\n([\s\S]*?)\n```/g, (match, jsonContent) => {
      if (isValidJSON(jsonContent.trim())) {
        const formatted = formatJSON(jsonContent.trim());
        return `\`\`\`json\n${formatted}\n\`\`\``;
      }
      return match;
    });

    formattedText = formattedText.replace(/```\n([\s\S]*?)\n```/g, (match, content) => {
      const trimmed = content.trim();
      if (isValidJSON(trimmed)) {
        const formatted = formatJSON(trimmed);
        return `\`\`\`json\n${formatted}\n\`\`\``;
      }
      return match;
    });

    if (hasSensitiveInfo && !showSensitive) {
      formattedText = maskSensitiveInfo(formattedText);
    }

    return formattedText;
  };

  // Shared markdown components for rich response rendering
  const markdownComponents = {
    code: ({ className, children, ...props }: React.ComponentProps<'code'> & { inline?: boolean }) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeContent = String(children).replace(/\n$/, '');
      const inline = props.inline;
      const language = match ? match[1] : null;

      // Fenced code block WITH a language → syntax highlighted
      if (!inline && language) {
        return <SyntaxHighlighter code={codeContent} language={language} showCopyButton={true} />;
      }
      // Fenced code block WITHOUT a language → compact fit-content code chip
      if (!inline) {
        const isMultiLine = codeContent.includes('\n');
        return isMultiLine ? (
          // Multi-line: full width block with monospace
          <pre
            className="my-2 px-3 py-2.5 rounded-lg text-[12.5px] leading-5 overflow-x-auto font-mono"
            style={{ background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" }}
          >
            {codeContent}
          </pre>
        ) : (
          // Single-line: inline-block, fits content width
          <code
            className="inline-block my-1 px-2.5 py-1 rounded-md text-[12.5px] font-mono"
            style={{ background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" }}
          >
            {codeContent}
          </code>
        );
      }
      // Inline code
      return (
        <code className="px-1.5 py-0.5 rounded text-[13px] font-mono" style={{ background: "#EEF2FF", color: "#4F46E5" }} {...props}>
          {children}
        </code>
      );
    },
    a: ({ href, children }: React.ComponentProps<'a'>) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: accentColor }}>
        {children}
      </a>
    ),
    h1: ({ children }: React.ComponentProps<'h1'>) => (
      <h1 className="text-[17px] font-semibold mt-4 mb-2 pb-1.5 border-b" style={{ color: "#111827", borderColor: "#E5E7EB" }}>{children}</h1>
    ),
    h2: ({ children }: React.ComponentProps<'h2'>) => (
      <h2 className="text-[15px] font-semibold mt-4 mb-1.5" style={{ color: "#1F2937" }}>{children}</h2>
    ),
    h3: ({ children }: React.ComponentProps<'h3'>) => (
      <h3 className="text-[14px] font-semibold mt-3 mb-1" style={{ color: "#374151" }}>{children}</h3>
    ),
    p: ({ children }: React.ComponentProps<'p'>) => (
      <p className="mb-3 last:mb-0 leading-relaxed text-[15px]" style={{ color: "#374151" }}>{children}</p>
    ),
    ul: ({ children }: React.ComponentProps<'ul'>) => (
      <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{children}</ul>
    ),
    ol: ({ children }: React.ComponentProps<'ol'>) => (
      <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{children}</ol>
    ),
    li: ({ children }: React.ComponentProps<'li'>) => (
      <li className="leading-relaxed text-[15px]" style={{ color: "#374151" }}>{children}</li>
    ),
    blockquote: ({ children }: React.ComponentProps<'blockquote'>) => (
      <blockquote className="pl-4 py-2 my-3 rounded-r-lg italic text-[14px]" style={{ borderLeft: `3px solid ${accentColor}`, background: "#F8FAFC", color: "#64748B" }}>
        {children}
      </blockquote>
    ),
    table: ({ children }: React.ComponentProps<'table'>) => (
      <div className="overflow-x-auto my-4 rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
        <table className="min-w-full text-[13px]" style={{ fontFamily: "'JetBrains Mono', monospace", borderCollapse: "collapse" }}>{children}</table>
      </div>
    ),
    thead: ({ children }: React.ComponentProps<'thead'>) => (
      <thead style={{ background: "#F8FAFC" }}>{children}</thead>
    ),
    tr: ({ children, ...props }: React.ComponentProps<'tr'>) => (
      <tr
        style={{ transition: "background 0.1s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F8FAFB"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
        {...props}
      >
        {children}
      </tr>
    ),
    th: ({ children }: React.ComponentProps<'th'>) => (
      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#64748B", borderBottom: "1px solid #E2E8F0", letterSpacing: "0.06em" }}>{children}</th>
    ),
    td: ({ children }: React.ComponentProps<'td'>) => (
      <td className="px-4 py-2.5 text-[12px]" style={{ color: "#374151", borderBottom: "1px solid #F1F5F9", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</td>
    ),
    hr: () => <hr className="my-4" style={{ borderColor: "#E2E8F0" }} />,
    strong: ({ children }: React.ComponentProps<'strong'>) => (
      <strong className="font-semibold" style={{ color: "#111827" }}>{children}</strong>
    ),
  };

  const messageContent = (
    <>
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {formatContent(role, mainContent)}
        </ReactMarkdown>
      </div>

      {/* Sources section — styled card replacing raw markdown */}
      {sources.length > 0 && (
        <SourcesCard sources={sources} accentColor={accentColor} />
      )}

      {hasSensitiveInfo && (
        <motion.div
          className="mt-3 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button onClick={toggleSensitive} variant="outline" size="sm" className="text-xs">
            {showSensitive ? "🙈 Hide" : "👁️ Show"} sensitive info
          </Button>
          {!showSensitive && (
            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              🛡️ Credentials masked for security
            </Badge>
          )}
        </motion.div>
      )}

      {buttons && buttons.length > 0 && (
        <motion.div
          className="mt-3 pl-2 border-l-2 border-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-sm text-muted-foreground mb-1">Available options:</div>
          {buttons.map((button, index) => (
            <motion.div
              key={index}
              className="py-1 text-muted-foreground"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-left justify-start h-auto p-1 font-normal"
                onClick={() => onButtonClick && onButtonClick(button.payload, button.title)}
                aria-label={button.title}
              >
                {index + 1}. {button.title}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {customForm && customForm.form_type === "multiselect" ? (
        <MultiSelectForm customForm={customForm} onButtonClick={onButtonClick} />
      ) : customForm && (customForm.form_type === "download" || customForm.form_type === "execution_plan" || customForm.form_type === "health") ? (
        <div className="mt-3 space-y-2">
          {!!(isSchemaDefinitions || (customForm.form_type === "download" && isSchemaDefinitions)) && (
            <ActionCard
              icon={Database}
              label="Schema Definitions"
              subtitle={(customForm.objects?.database_name as string) || "Database"}
              onClick={() => onShowContext?.({ type: "schema", title: "Schema Definitions", data: customForm.objects as Record<string, unknown> })}
            />
          )}
          {(isExecutionPlan || customForm.form_type === "execution_plan") && (
            <ActionCard
              icon={BarChart3}
              label="Execution Plan"
              subtitle={`${customForm.objects?.rows || 0} rows · ${customForm.objects?.execution_time || 0}ms`}
              onClick={() => onShowContext?.({ type: "execution_plan", title: "Execution Plan", data: customForm.objects as Record<string, unknown> })}
            />
          )}
          {customForm.form_type === "health" && (
            <ActionCard
              icon={Activity}
              label="Performance Snapshot"
              subtitle={(customForm.objects?.database_name as string) || "Database"}
              onClick={() => onShowContext?.({ type: "health", title: "Performance Snapshot", data: customForm.objects as Record<string, unknown> })}
            />
          )}
          {customForm.form_type === "download" && !isSchemaDefinitions && !isExecutionPlan && (
            <ActionCard
              icon={Database}
              label={customForm.file_name}
              subtitle="Download"
              href={`${API_URL}/download/${customForm.file_name}`}
            />
          )}
        </div>
      ) : customForm ? (
        <div className="text-sm text-muted-foreground mt-2">{customForm.text}</div>
      ) : null}
    </>
  );

  return (
    <motion.div
      className="mb-3"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      layout
    >
      {isUser ? (
        /* ── User message: right-aligned, accent border on RIGHT ── */
        <div className="flex items-start justify-end gap-2.5">
          <div
            className="max-w-[65%] min-w-20 px-4 py-2.5 rounded-2xl rounded-tr-sm"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E9ECEF",
              borderRightWidth: "3px",
              borderRightColor: "#7C3AED",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <p className="text-[14px] leading-relaxed" style={{ color: "#1A1E2E" }}>
              {cleanContent}
            </p>
            {timestamp && (
              <div className="text-[10px] mt-1 text-right" style={{ color: "#ADB5BD" }}>
                {format(new Date(timestamp), "h:mm a")}
              </div>
            )}
          </div>
          {/* User avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5"
            style={{ background: "#7C3AED", color: "#fff" }}
          >
            {userInitials}
          </div>
        </div>
      ) : (
        /* ── Assistant message: card left-aligned with bot avatar ── */
        <div className="flex items-start gap-2.5">
          {/* Bot avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-0.5"
            style={{ background: "#1A1E2E" }}
          >
            <Bot className="w-4 h-4" style={{ color: "#fff" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 border-l-[3px]"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E9ECEF",
                borderLeftWidth: "3px",
                borderLeftColor: accentColor,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {messageContent}
            </div>

            {timestamp && (
              <div className="text-[11px] mt-1 pl-1" style={{ color: "#ADB5BD" }}>
                {format(new Date(timestamp), "h:mm a")}
              </div>
            )}

            {!isUser && (
              <>
                <MessageActions
                  content={content}
                  feedbackState={hasBackendId ? feedbackState : "none"}
                  onFeedback={handleFeedbackClick}
                  onRetry={onRetry}
                  disabled={!hasBackendId}
                />
                <FeedbackDialog
                  open={feedbackDialogOpen}
                  onOpenChange={setFeedbackDialogOpen}
                  feedbackType={feedbackDialogType}
                  onSubmit={handleFeedbackDialogSubmit}
                />
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SourcesCard({ sources, accentColor }: { sources: { label: string; url: string }[]; accentColor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-xl overflow-hidden border" style={{ borderColor: "#E9ECEF" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
        style={{ background: "#F1F3F5" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#E9ECEF"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#F1F3F5"; }}
      >
        <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: accentColor }}>
          <span>📎</span>
          <span>Sources ({sources.length})</span>
        </div>
        <span className="text-[11px]" style={{ color: "#ADB5BD" }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 flex flex-col gap-1.5" style={{ background: "#FAFAFA" }}>
          {sources.map((s, i) => (
            s.url ? (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13px] hover:underline"
                style={{ color: accentColor }}
              >
                <span className="text-[10px]" style={{ color: "#ADB5BD" }}>{i + 1}.</span>
                {s.label}
              </a>
            ) : (
              <span key={i} className="flex items-center gap-2 text-[13px]" style={{ color: "#495057" }}>
                <span className="text-[10px]" style={{ color: "#ADB5BD" }}>{i + 1}.</span>
                {s.label}
              </span>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectForm({ customForm, onButtonClick }: { customForm: CustomForm, onButtonClick?: (payload: string, title?: string) => void }) {
  const [selected, setSelected] = useState<{ [type: string]: Set<string> }>(() => {
    const initial: { [type: string]: Set<string> } = {};
    if (customForm.objects) {
      Object.keys(customForm.objects).forEach(type => {
        initial[type] = new Set();
      });
    }
    return initial;
  });

  const handleChange = (type: string, value: string) => {
    setSelected(prev => {
      const newSet = new Set(prev[type]);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return { ...prev, [type]: newSet };
    });
  };

  const handleSave = () => {
    // Flatten selected into an object of arrays
    const result: { [type: string]: string[] } = {};
    Object.keys(selected).forEach(type => {
      result[type] = Array.from(selected[type]);
    });
    if (onButtonClick) {
      const resultObjects = {"objects": result}
      const command = JSON.stringify(resultObjects);
      onButtonClick(command, "Save");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="text-sm text-muted-foreground mb-1">{customForm.text}</div>
      {customForm.objects && Object.keys(customForm.objects).map(type => (
        <div key={type} className="mb-2">
          <div className="font-semibold mb-1">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
          <div className="flex flex-wrap gap-2">
            {(customForm.objects[type] as string[]).map((item: string) => (
              <label key={item} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected[type]?.has(item) || false}
                  onChange={() => handleChange(type, item)}
                  className="accent-primary"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button
        className="mt-2"
        onClick={handleSave}
      >
        Save
      </Button>
    </motion.div>
  );
}
