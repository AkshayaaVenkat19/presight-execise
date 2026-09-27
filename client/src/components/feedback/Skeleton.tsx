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

export function LoadingIndicator({
  label,
  className = "w-[90px]",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span className="inline-flex items-center" role="status">
      <Skeleton className={className} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SessionSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-[400px] flex-col gap-6 rounded-2xl border border-border bg-surface px-7 py-10 tablet:mx-0"
      role="status"
      aria-label="Checking your session"
    >
      <span className="sr-only">Checking your session…</span>
      <Skeleton className="mx-auto w-32" />
      <Skeleton className="h-12! w-full rounded-full!" />
      <Skeleton className="h-12! w-full rounded-full!" />
      <Skeleton className="h-11! w-full rounded-full!" />
    </div>
  );
}

export function DirectorySkeleton({
  table = false,
  label = "Loading users",
}: {
  table?: boolean;
  label?: string;
}) {
  return (
    <div
      className={`grid ${table ? "grid-cols-1" : "grid-cols-1 gap-4 desktop:grid-cols-2"}`}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
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
