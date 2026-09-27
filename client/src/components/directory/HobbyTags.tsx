export function HobbyTags({
  hobbies,
  compact = false,
}: {
  hobbies: string[];
  compact?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-[5px] overflow-hidden ${compact ? "" : "mt-[7px]"}`}
    >
      {hobbies.length === 0 ? (
        <span className="text-[11px] text-muted">No hobbies listed</span>
      ) : (
        hobbies.slice(0, 2).map((hobby) => (
          <span
            className="inline-block min-w-0 max-w-[140px] shrink truncate rounded-md border border-support/20 bg-support-soft px-2 py-[5px] text-[10px] text-support"
            key={hobby}
            title={hobby}
          >
            {hobby}
          </span>
        ))
      )}
      {hobbies.length > 2 && (
        <span
          className="shrink-0 rounded-md border border-transparent bg-accent-soft px-2 py-[5px] text-[10px] text-accent"
          title={hobbies.slice(2).join(", ")}
          aria-label={`${hobbies.length - 2} more hobbies: ${hobbies.slice(2).join(", ")}`}
        >
          +{hobbies.length - 2}
        </span>
      )}
    </div>
  );
}
