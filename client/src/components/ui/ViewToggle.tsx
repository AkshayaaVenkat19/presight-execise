import type { DirectoryView } from "../../types/directory";
import { Icon } from "./Icon";

export function ViewToggle({
  view,
  onChange,
}: {
  view: DirectoryView;
  onChange: (view: DirectoryView) => void;
}) {
  const buttonClasses =
    "flex items-center justify-center gap-[7px] rounded-full bg-transparent px-[9px] py-[7px] text-[11px] font-medium text-muted aria-pressed:bg-accent-soft aria-pressed:text-accent compact:px-3";
  return (
    <div
      className="inline-flex shrink-0 rounded-full border border-border bg-surface p-1"
      role="group"
      aria-label="Directory view"
    >
      <button
        className={buttonClasses}
        type="button"
        aria-pressed={view === "cards"}
        onClick={() => onChange("cards")}
      >
        <Icon name="grid" width="15" height="15" />
        <span>Cards</span>
      </button>
      <button
        className={buttonClasses}
        type="button"
        aria-pressed={view === "table"}
        onClick={() => onChange("table")}
      >
        <Icon name="table" width="15" height="15" />
        <span>Table</span>
      </button>
    </div>
  );
}
