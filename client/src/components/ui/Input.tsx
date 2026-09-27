import type { ComponentPropsWithRef } from "react";

export interface InputProps extends ComponentPropsWithRef<"input"> {}

export function Input({ type = "text", className = "", ...props }: InputProps) {
  const styles = {
    default: "rounded-lg border border-border bg-background px-3 py-3",
    search:
      "h-11 w-full min-w-0 border-0 bg-transparent text-xs text-text outline-none placeholder:text-muted",
    checkbox: "m-0 size-[15px] shrink-0 cursor-pointer accent-accent",
  };
  const classes =
    type === "checkbox"
      ? styles.checkbox
      : type === "search"
        ? styles.search
        : styles.default;

  return <input type={type} className={`${classes} ${className}`} {...props} />;
}
