import { useState } from "react";
import type { DirectoryState, Facets } from "../../types/directory";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { FilterGroup } from "./FilterGroup";

interface Props {
  state: DirectoryState;
  facets?: Facets;
  loading: boolean;
  error: Error | null;
  retry: () => void;
  toggle: (kind: "nationalities" | "hobbies", value: string) => void;
  clear: () => void;
}

export function FilterSidebar({
  state,
  facets,
  loading,
  error,
  retry,
  toggle,
  clear,
}: Props) {
  const [open, setOpen] = useState(false);
  const count = state.nationalities.length + state.hobbies.length;
  return (
    <aside
      className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-panel"
      aria-label="Directory filters"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5 tablet:px-5 tablet:py-[21px]">
        <h2 className="flex items-center gap-[9px] text-sm font-semibold">
          <Icon className="text-muted" name="filter" />
          Filters
          {count > 0 && (
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent">
              {count}
            </span>
          )}
        </h2>
        <button
          className="bg-transparent p-1 text-xs font-semibold text-accent hover:underline"
          type="button"
          onClick={clear}
          disabled={count === 0 && !state.q}
        >
          Reset
        </button>
      </div>
      <button
        className="flex w-full items-center justify-between bg-surface px-4 py-3 text-xs text-muted tablet:hidden"
        type="button"
        aria-expanded={open}
        aria-controls="filter-options"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide filters" : "Show filters"}
        <Icon name="filter" />
      </button>
      <div
        id="filter-options"
        className={`border-border px-5 pt-[18px] pb-[22px] tablet:block tablet:border-t-0 ${open ? "block border-t" : "hidden"}`}
      >
        <p className="mb-[26px] text-[11px] leading-[1.7] text-muted">
          Narrow your search. Counts reflect the current results.
        </p>
        {error && !loading ? (
          <div
            className="text-xs leading-relaxed text-muted [&>p]:mb-3"
            role="alert"
          >
            <p>Could not load filter counts</p>
            <p>{error.message}</p>
            <Button variant="secondary" size="sm" onClick={retry}>
              Retry filters
            </Button>
          </div>
        ) : (
          <>
            <FilterGroup
              title="Nationalities"
              values={facets?.nationalities ?? []}
              selected={state.nationalities}
              onToggle={(value) => toggle("nationalities", value)}
              loading={loading}
              maxSelected={50}
            />
            <FilterGroup
              title="Hobbies"
              values={facets?.hobbies ?? []}
              selected={state.hobbies}
              onToggle={(value) => toggle("hobbies", value)}
              loading={loading}
              maxSelected={10}
            />
          </>
        )}
      </div>
    </aside>
  );
}
