import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../layout/themeProvider";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get the appropriate icon based on current theme
  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun size={18} />;
      case "dark":
        return <Moon size={18} />;
      case "system":
        return <Monitor size={18} />;
      default:
        return <Sun size={18} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-2 rounded-md bg-background hover:bg-gray-100 dark:hover:bg-gray-800 border border-border transition-colors duration-200"
        aria-label="Theme switcher"
      >
        <span className="text-foreground">{getThemeIcon()}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1 w-36 bg-background border border-border rounded-md shadow-md z-10 overflow-hidden"
          >
            <div className="py-1">
              <button
                onClick={() => {
                  setTheme("light");
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${theme === "light" ? "bg-gray-100 dark:bg-gray-800" : ""}`}
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button
                onClick={() => {
                  setTheme("dark");
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${theme === "dark" ? "bg-gray-100 dark:bg-gray-800" : ""}`}
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => {
                  setTheme("system");
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${theme === "system" ? "bg-gray-100 dark:bg-gray-800" : ""}`}
              >
                <Monitor size={16} />
                <span>System</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
