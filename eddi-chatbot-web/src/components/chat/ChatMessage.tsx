// src/components/ChatMessage.tsx (updated)
import { format } from "date-fns";
import { motion } from "framer-motion";
import { CustomForm, FeedbackType, FeedbackRequest } from "@/types";
import { useState } from "react";
import { API_URL } from "@/lib/config";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { maskSensitiveInfo, containsSensitiveInfo } from "@/utils/maskSensitiveInfo";
import { BarChart3, Database, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SyntaxHighlighter from "@/components/ui/SyntaxHighlighter";
import type { ContextPanelData } from "./ContextPanel";
import MessageActions from "./MessageActions";
import FeedbackDialog from "./FeedbackDialog";

// JSON formatting utility
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
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
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
      <div className="text-[12px] font-medium flex-shrink-0" style={{ color: "#868E96" }}>
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

  // Whether this message has a real backend ID (not a local numeric or welcome message ID)
  const hasBackendId = typeof messageId === "string" && messageId.length > 10;

  const handleFeedbackClick = (type: FeedbackType) => {
    if (!hasBackendId) return;
    // If clicking the already-active feedback, remove it
    if (feedbackState === type) {
      onFeedbackRemove?.(messageId as string);
      return;
    }
    // Open the dialog for new feedback
    setFeedbackDialogType(type);
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackDialogSubmit = (data: FeedbackRequest) => {
    if (hasBackendId) {
      onFeedbackSubmit?.(messageId as string, data);
    }
  };
  
  // Check if this is an execution plan by looking for execution plan structure in objects
  const isExecutionPlan = customForm?.objects && 
    (customForm.objects.metadata || customForm.objects.execution_plan || 
     (customForm.objects.analyzed !== undefined && customForm.objects.cost !== undefined));
  
  // Check if this is schema definitions by looking for definitions structure
  const isSchemaDefinitions = customForm?.objects && 
    customForm.objects.definitions && 
    customForm.objects.database_type;
  
  // Initialize showSensitive from session storage or default to false
  const [showSensitive, setShowSensitive] = useState(() => {
    if (!hasSensitiveInfo) return false;
    try {
      const stored = sessionStorage.getItem('showSensitiveInfo');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Update session storage when preference changes
  const toggleSensitive = () => {
    const newValue = !showSensitive;
    setShowSensitive(newValue);
    try {
      sessionStorage.setItem('showSensitiveInfo', newValue.toString());
    } catch {
      // Ignore storage errors
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  const formatContent = (role: string, text: string) => {
    // Format the content to replace new lines with <br />
    let formattedText = text;

    // /inform_database_version{"database_version":"postgresql15"}
    if(text.startsWith("/")){
      formattedText = text.replace("/","")
    }
    
    console.log("Formatted Text: ", formattedText);

    if (role == "assistant" && formattedText.includes("{")) {
      try {
        const [, json] = formattedText.split("{");
        const jsonString = "{" + json;
        const parsedJson = JSON.parse(jsonString);
        // extract the value of the first key
        const firstKey = Object.keys(parsedJson)[0];
        const firstValue = parsedJson[firstKey];
        formattedText = `${firstValue}`;
      } catch (error) {
        console.error("Failed to parse JSON from message content:", error);
        // Keep the original formatted text if JSON parsing fails
      }
    } 

    // Format JSON content for better readability
    formattedText = formattedText.replace(/```json\n([\s\S]*?)\n```/g, (match, jsonContent) => {
      if (isValidJSON(jsonContent.trim())) {
        const formatted = formatJSON(jsonContent.trim());
        return `\`\`\`json\n${formatted}\n\`\`\``;
      }
      return match;
    });

    // Also format standalone JSON blocks (without language specification)
    formattedText = formattedText.replace(/```\n([\s\S]*?)\n```/g, (match, content) => {
      const trimmed = content.trim();
      if (isValidJSON(trimmed)) {
        const formatted = formatJSON(trimmed);
        return `\`\`\`json\n${formatted}\n\`\`\``;
      }
      return match;
    });

    // Apply sensitive information masking unless user explicitly wants to see it
    if (hasSensitiveInfo && !showSensitive) {
      formattedText = maskSensitiveInfo(formattedText);
    }

    // ReactMarkdown will handle markdown formatting, so we preserve the original formatting
    // Don't replace whitespace as it's needed for markdown structure

    return formattedText;
  }

  // Ensure consistent animation by using a memo for the variants
  // This prevents animation glitches when messages are added/removed

  return (
    <motion.div
      className={`mb-5 ${isUser ? "flex justify-end" : ""}`}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      layout
    >
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl px-4 py-2.5"
            : "max-w-full"
        }
        style={
          isUser
            ? { background: "#EDE9FE", color: "#1A1E2E" }
            : undefined
        }
      >
        <div className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ className, children, ...props }: React.ComponentProps<'code'> & { inline?: boolean }) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeContent = String(children).replace(/\n$/, '');
                const inline = props.inline;
                const language = match ? match[1] : 'plaintext';
                
                return !inline && match ? (
                  <SyntaxHighlighter
                    code={codeContent}
                    language={language}
                    showCopyButton={true}
                  />
                ) : (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {formatContent(role, content)}
          </ReactMarkdown>
        </div>

        {hasSensitiveInfo && (
          <motion.div
            className="mt-3 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={toggleSensitive}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {showSensitive ? "🙈 Hide" : "👁️ Show"} sensitive info
            </Button>
            {!showSensitive && (
              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
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
            <div className="text-sm text-muted-foreground mb-1">
              Available options (type your response):
            </div>
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
                </Button>{" "}
              </motion.div>
            ))}
          </motion.div>
        )}

        {customForm && customForm.form_type === "multiselect" ? (
          <MultiSelectForm customForm={customForm} onButtonClick={onButtonClick} />
        ) : customForm && (customForm.form_type === "download" || customForm.form_type === "execution_plan" || customForm.form_type === "health") ? (
          <div className="mt-3 space-y-2">
            {/* Inline action card */}
            {(isSchemaDefinitions || (customForm.form_type === "download" && isSchemaDefinitions)) && (
              <ActionCard
                icon={Database}
                label="Schema Definitions"
                subtitle={customForm.objects?.database_name || "Database"}
                onClick={() => onShowContext?.({
                  type: "schema",
                  title: "Schema Definitions",
                  data: customForm.objects,
                })}
              />
            )}
            {(isExecutionPlan || customForm.form_type === "execution_plan") && (
              <ActionCard
                icon={BarChart3}
                label="Execution Plan"
                subtitle={`${customForm.objects?.rows || 0} rows · ${customForm.objects?.execution_time || 0}ms`}
                onClick={() => onShowContext?.({
                  type: "execution_plan",
                  title: "Execution Plan",
                  data: customForm.objects,
                })}
              />
            )}
            {customForm.form_type === "health" && (
              <ActionCard
                icon={Activity}
                label="Performance Snapshot"
                subtitle={customForm.objects?.database_name || "Database"}
                onClick={() => onShowContext?.({
                  type: "health",
                  title: "Performance Snapshot",
                  data: customForm.objects,
                })}
              />
            )}
            {/* Plain download (no schema/plan) */}
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
          <div className="text-sm text-muted-foreground mt-2">
            {customForm.text}
          </div>
        ) : null}

        {timestamp && (
          <div
            className={`text-[11px] mt-1.5 ${isUser ? "text-right" : ""}`}
            style={{ color: "#ADB5BD" }}
          >
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
    </motion.div>
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
            {customForm.objects[type].map((item: string) => (
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
