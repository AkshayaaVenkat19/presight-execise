import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";

export function StatusPanel({
  title,
  message,
  children,
  error = false,
}: {
  title: string;
  message: string;
  children?: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className="min-h-[360px] rounded-xl border border-dashed border-border bg-surface px-6 py-[70px] text-center"
      role={error ? "alert" : "status"}
    >
      <span
        className={`mb-5 inline-grid size-16 place-items-center rounded-[20px] ${error ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"}`}
      >
        <Icon name={error ? "filter" : "people"} width="28" height="28" />
      </span>
      <h2 className="text-xl font-semibold tracking-[-.4px]">{title}</h2>
      <p className="mx-auto mt-2.5 mb-6 max-w-[460px] text-[13px] leading-[1.7] wrap-anywhere text-muted">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {children}
      </div>
    </div>
  );
}
