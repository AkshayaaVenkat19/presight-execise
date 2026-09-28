import type { FacetValue } from "../../types/directory";
import { Skeleton } from "../feedback/Skeleton";
import { Input } from "../ui/Input";

interface Props {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  loading: boolean;
  maxSelected: number;
}

export function FilterGroup({
  title,
  values,
  selected,
  onToggle,
  loading,
  maxSelected,
}: Props) {
  const options = [
    ...values,
    ...selected
      .filter((value) => !values.some((option) => option.value === value))
      .map((value) => ({ value, count: 0 })),
  ];
  return (
    <fieldset className="m-0 flex min-h-0 min-w-0 flex-col border-0 p-0">
      <legend className="mb-1 flex w-full shrink-0 items-center tablet:mb-3.5 justify-between p-0 text-xs font-semibold">
        {title}
        <span className="text-[10px] font-normal text-muted">Top 20</span>
      </legend>
      {loading ? (
        <div
          className="scrollbar-thin grid min-h-0 flex-1 gap-[19px] overflow-y-auto py-1.5"
          role="status"
          aria-label={`Loading ${title.toLowerCase()}`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} />
          ))}
        </div>
      ) : options.length === 0 ? (
        <p className="shrink-0 text-xs leading-relaxed text-muted">
          No matching {title.toLowerCase()}.
        </p>
      ) : (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-[3px]">
          {options.map(({ value, count }) => (
            <label
              className="flex cursor-pointer items-center gap-[9px] py-[7px] text-xs"
              key={value}
            >
              <Input
                type="checkbox"
                aria-label={`${value}, ${count} matching people`}
                checked={selected.includes(value)}
                disabled={
                  !selected.includes(value) && selected.length >= maxSelected
                }
                onChange={() => onToggle(value)}
              />
              <span className="min-w-0 flex-1 truncate" title={value}>
                {value}
              </span>
              <span className="min-w-[26px] rounded-[5px] bg-surface-soft px-[5px] py-[3px] text-center text-[10px] text-muted tabular-nums">
                {count.toLocaleString()}
              </span>
            </label>
          ))}
        </div>
      )}
      {selected.length >= maxSelected && (
        <p className="shrink-0 text-xs leading-relaxed text-muted">
          Up to {maxSelected} selections allowed.
        </p>
      )}
    </fieldset>
  );
}
