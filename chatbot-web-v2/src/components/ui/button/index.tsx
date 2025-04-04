import React from "react";

export type ButtonVariant =
  | "muted"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost";

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = "primary",
  className = "",
  icon,
}) => {
  const baseClasses =
    "px-4 h-8 flex items-center justify-center rounded font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";
  const variantClasses = {
    muted:
      "bg-muted DEFAULT hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
    primary: "bg-primary hover:bg-primary/80 text-white",
    secondary:
      "bg-secondary-600 hover:bg-secondary-700 text-white dark:bg-secondary-700 dark:hover:bg-secondary-800",
    outline:
      "border-2 border-border text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",
    ghost:
      "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <button className={classes} onClick={onClick}>
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
};

export default Button;
