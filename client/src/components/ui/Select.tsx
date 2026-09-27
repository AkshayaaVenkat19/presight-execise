import type { ComponentPropsWithRef } from "react";
import { Icon } from "./Icon";

export interface SelectProps extends ComponentPropsWithRef<"select"> {
  wrapperClassName?: string;
}

export function Select({
  children,
  className = "",
  wrapperClassName = "",
  ...props
}: SelectProps) {
  const isDropdown =
    !props.multiple && (props.size === undefined || props.size <= 1);
  const classes =
    "w-full min-h-11 rounded-[9px] border border-border bg-surface px-2.5 py-2 text-[11px] text-text focus:border-accent";

  return (
    <span className={`relative inline-block min-w-0 ${wrapperClassName}`}>
      <select
        className={`${classes} ${isDropdown ? "appearance-none pr-9" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {isDropdown && (
        <Icon
          name="chevron-down"
          width="16"
          height="16"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        />
      )}
    </span>
  );
}
