import React from "react";
import { useTheme } from "../../layout/themeProvider";
import { Moon } from "lucide-react";

const ThemeSwitcher: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-md bg-background border border-border">
      <span className="text-foreground"><Moon size={18} /></span>
      <span className="text-sm text-foreground capitalize">{theme}</span>
    </div>
  );
};

export default ThemeSwitcher;
