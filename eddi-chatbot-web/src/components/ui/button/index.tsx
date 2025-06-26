import React from "react";

export type ButtonVariant =
  | "muted"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  className?: string;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      label,
      variant = "primary",
      size = "default",
      className = "",
      icon,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center cursor-pointer justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

    const sizeClasses = {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-10 px-8",
      icon: "h-9 w-9",
    };
    const variantClasses = {
      muted: "bg-muted hover:bg-muted/80 text-muted-foreground",
      primary: "bg-primary text-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline:
        "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    };

    const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

    return (
      <button className={classes} ref={ref} {...props}>
        {icon && (
          <span className={children || label ? "mr-2" : ""}>{icon}</span>
        )}
        {children || label}
      </button>
    );
  }
);

export default Button;
