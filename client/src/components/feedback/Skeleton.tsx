export function Skeleton({
  className = "",
  shape = "line",
}: {
  className?: string;
  shape?: "line" | "avatar";
}) {
  const dimensions =
    shape === "avatar"
      ? "size-[52px] shrink-0 rounded-full"
      : "h-[13px] rounded-md";
  return (
    <span
      className={`skeleton relative block overflow-hidden bg-surface-soft ${dimensions} ${className}`}
      aria-hidden="true"
    />
  );
}

export function DirectorySkeleton({ table = false }: { table?: boolean }) {
  return (
    <div
      className={`grid ${table ? "grid-cols-1" : "grid-cols-1 gap-4 desktop:grid-cols-2"}`}
      role="status"
      aria-label="Loading users"
    >
      <span className="sr-only">Loading users</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className={`flex gap-3.5 border border-border bg-surface p-6 ${table ? "h-[88px]" : "h-[180px] rounded-xl"}`}
          key={index}
        >
          <Skeleton shape="avatar" />
          <div
            className={`flex flex-1 gap-[18px] pt-1.5 ${table ? "items-center [&>span]:flex-1" : "flex-col"}`}
          >
            <Skeleton />
            <Skeleton className="w-[90px]" />
            <Skeleton />
          </div>
        </div>
      ))}
    </div>
  );
}
