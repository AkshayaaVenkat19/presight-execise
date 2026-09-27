import type { ComponentPropsWithRef } from "react";

export interface SelectProps extends ComponentPropsWithRef<"select"> {}

export function Select({ children, className = "", ...props }: SelectProps) {
  const classes =
    "min-h-11 rounded-[9px] border border-border bg-surface px-2.5 py-2 text-[11px] text-text";

  return (
    <select className={`${classes} ${className}`} {...props}>
      {children}
    </select>
  );
}
