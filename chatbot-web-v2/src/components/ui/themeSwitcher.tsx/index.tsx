import React from "react";
import { useTheme } from "../../layout/themeProvider";

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme("light")}
        className={`px-3 py-1 rounded ${
          theme === "light"
            ? "bg-primary text-white"
            : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`px-3 py-1 rounded ${
          theme === "dark"
            ? "bg-primary text-white"
            : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        Dark
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`px-3 py-1 rounded ${
          theme === "system"
            ? "bg-primary text-white"
            : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        System
      </button>
    </div>
  );
};

export default ThemeSwitcher;
