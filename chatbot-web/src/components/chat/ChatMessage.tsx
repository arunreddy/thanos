// src/components/ChatMessage.tsx (updated)
import { format } from "date-fns";
import { User, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { CustomForm } from "@/types";
import React, { useState } from "react";
import { API_URL } from "@/lib/api";
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
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  console.log("-----> CUSTOM FORM", customForm);

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
        <div className="whitespace-pre-wrap">{content}</div>

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
