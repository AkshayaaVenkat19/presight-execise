import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) => {
  const variants = {
    primary:
      "border-transparent bg-accent text-on-accent hover:bg-accent-hover",
    secondary: "border-border bg-surface text-text hover:bg-surface-soft",
    danger: "border-transparent bg-danger-soft text-danger",
  };
  const sizes = {
    sm: "px-3 py-2 text-[11px]",
    md: "px-4 py-[11px] text-xs",
    lg: "px-5 py-3.5 text-sm",
  };
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors motion-reduce:transition-none ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
};
