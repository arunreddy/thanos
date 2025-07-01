// src/components/ChatMessage.tsx (updated)
import { format } from "date-fns";
import { User, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { CustomForm } from "@/types";
import { useState } from "react";
import { API_URL } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { maskSensitiveInfo, containsSensitiveInfo } from "@/utils/maskSensitiveInfo";
import { Copy, Check } from "lucide-react";

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
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Copy className="w-3 h-3 text-muted-foreground" />
      )}
    </button>
  );
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
  onButtonClick?: (payload: string) => void;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  buttons = [],
  customForm,
  onButtonClick,
}: ChatMessageProps) {
  const isUser = role === "user";
  const hasSensitiveInfo = containsSensitiveInfo(content);
  
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
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const messageVariants = {
    hidden: {
      x: isUser ? 20 : -20,
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
        duration: 0.4,
      },
    },
    exit: {
      x: isUser ? 20 : -20,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  };

  const formatContent = (role: string, text: string) => {
    // Format the content to replace new lines with <br />
    var formattedText = text;

    // /inform_database_version{"database_version":"postgresql15"}
    if(text.startsWith("/")){
      formattedText = text.replace("/","")
    }
    
    console.log("Formatted Text: ", formattedText);

    if (role == "assistant" && formattedText.includes("{")) {
      try {
        const [_, json] = formattedText.split("{");
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
      className={`flex mb-4 items-start gap-2 ${
        isUser ? "justify-end" : "justify-start"
      }`}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      layout
    >
      {!isUser && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Bot className="w-6 h-6 mt-2 text-muted-foreground" />
        </motion.div>
      )}
      <motion.div
        variants={messageVariants}
        className={`
        max-w-[80%] rounded-lg px-4 py-2 
        ${
          isUser
            ? "bg-secondary text-secondary-foreground rounded-br-none"
            : "bg-background border border-border rounded-bl-none"
        }
      `}
      >
        <div className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeContent = String(children).replace(/\n$/, '');
                
                return !inline && match ? (
                  <div className="relative group">
                    <pre className="bg-muted p-3 rounded-lg overflow-x-auto border">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                    <CopyButton text={codeContent} />
                  </div>
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
            <button
              onClick={toggleSensitive}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {showSensitive ? "🙈 Hide" : "👁️ Show"} sensitive info
            </button>
            {!showSensitive && (
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                🛡️ Credentials masked for security
              </span>
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
                <button
                  className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded px-1 cursor-pointer"
                  onClick={() => onButtonClick && onButtonClick(button.payload)}
                  role="button"
                  aria-label={button.title}
                >
                  {index + 1}. {button.title}
                </button>{" "}
              </motion.div>
            ))}
          </motion.div>
        )}

        {customForm && customForm.form_type === "multiselect" ? (
          <MultiSelectForm customForm={customForm} onButtonClick={onButtonClick} />
        ) : customForm && customForm.form_type === "download" ? (
          <motion.div>
            <div className="text-sm text-muted-foreground mb-1">
              {customForm.text}
            </div>
            <a
              href={`${API_URL}/download/${customForm.file_name}`}
              download={customForm.file_name}
              className="inline-block mt-2 px-4 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              target="_blank"
            >
              Download {customForm.file_name}
            </a>
          </motion.div>
        ) : customForm ? (
          <motion.div>
            <div className="text-sm text-muted-foreground mb-1">
              {customForm.text}
            </div>
            <div className="text-sm text-muted-foreground mb-1">
              {customForm.objects && Object.keys(customForm.objects).map((key) => (
                <div key={key}>{key}</div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {timestamp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-xs mt-1 ${
              isUser ? "text-muted-foreground" : "text-muted-foreground"
            }`}
          >
            {format(new Date(timestamp), "h:mm a")}
          </motion.div>
        )}
      </motion.div>
      {isUser && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <User className="w-6 h-6 mt-2 text-muted-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
}

function MultiSelectForm({ customForm, onButtonClick }: { customForm: CustomForm, onButtonClick?: (payload: string) => void }) {
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
      onButtonClick(command);
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
      <button
        className="mt-2 px-4 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        onClick={handleSave}
      >
        Save
      </button>
    </motion.div>
  );
}
