import { useEffect, useLayoutEffect, useState } from "react";
import type { DirectoryView, User } from "../../types/directory";
import { useVirtualWindow } from "../../hooks/useVirtualWindow";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Skeleton } from "../feedback/Skeleton";
import { HobbyTags } from "./HobbyTags";
import { UserCard } from "./UserCard";

interface Props {
  users: User[];
  total: number;
  view: DirectoryView;
  hasNextPage: boolean;
  fetchingNext: boolean;
  updating?: boolean;
  nextError: Error | null;
  loadMore: () => void;
}

export function VirtualUserList({
  users,
  total,
  view,
  hasNextPage,
  fetchingNext,
  updating = false,
  nextError,
  loadMore,
}: Props) {
  const [columns, setColumns] = useState(1);
  const table = view === "table";
  const rowHeight = table ? 55 : 196;
  const rowCount = Math.ceil(users.length / (table ? 1 : columns));
  const { viewportRef, onScroll, width, start, end, totalHeight } =
    useVirtualWindow(rowCount, rowHeight, table ? 44 : 0);

  useLayoutEffect(() => {
    setColumns(!table && width >= 720 ? 2 : 1);
  }, [table, width]);

  useEffect(() => {
    if (
      !updating &&
      end >= rowCount - 2 &&
      hasNextPage &&
      !fetchingNext &&
      !nextError
    )
      loadMore();
  }, [end, rowCount, hasNextPage, fetchingNext, nextError, loadMore, updating]);

  const visibleRows = Array.from(
    { length: Math.max(0, end - start) },
    (_, offset) => start + offset,
  );
  const headerClasses =
    "sticky top-0 z-10 h-11 border-b border-border bg-surface-soft px-[18px] text-left text-[10px] font-semibold text-muted";
  const cellClasses =
    "overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-[18px] text-xs";
  return (
    <div
      className={`scrollbar-thin min-h-0 flex-1 overflow-auto overscroll-contain [overflow-anchor:none] ${table ? "rounded-xl border border-border bg-surface" : "pt-px pr-1 pl-px"}`}
      ref={viewportRef}
      onScroll={onScroll}
      tabIndex={0}
      role="region"
      aria-label={`User directory, ${view} view`}
    >
      {table ? (
        <table
          className="w-full min-w-[660px] table-fixed border-separate border-spacing-0"
          aria-rowcount={total + 1}
        >
          <caption className="sr-only">
            User directory. More users load as you scroll.
          </caption>
          <thead>
            <tr>
              <th className={`${headerClasses} w-[32%]`} scope="col">
                Name
              </th>
              <th className={`${headerClasses} w-[23%]`} scope="col">
                Nationality
              </th>
              <th className={`${headerClasses} w-[9%]`} scope="col">
                Age
              </th>
              <th className={`${headerClasses} w-[36%]`} scope="col">
                Hobbies
              </th>
            </tr>
          </thead>
          <tbody>
            {start > 0 && (
              <tr aria-hidden="true">
                <td
                  className="border-0 p-0"
                  colSpan={4}
                  style={{ height: start * rowHeight }}
                />
              </tr>
            )}
            {visibleRows.map((index) => {
              const user = users[index];
              return (
                <tr
                  key={user.id}
                  aria-rowindex={index + 2}
                  style={{ height: rowHeight }}
                >
                  <td className={cellClasses}>
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size="sm" />
                      <span
                        className="min-w-0 truncate font-semibold"
                        title={`${user.first_name} ${user.last_name}`}
                      >
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </td>
                  <td className={cellClasses} title={user.nationality}>
                    {user.nationality}
                  </td>
                  <td className={cellClasses}>{user.age}</td>
                  <td className={cellClasses}>
                    <HobbyTags hobbies={user.hobbies} compact />
                  </td>
                </tr>
              );
            })}
            {end < rowCount && (
              <tr aria-hidden="true">
                <td
                  className="border-0 p-0"
                  colSpan={4}
                  style={{ height: (rowCount - end) * rowHeight }}
                />
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <div
          className="relative"
          role="list"
          aria-label="Users"
          style={{ height: totalHeight }}
        >
          {visibleRows.map((index) => (
            <div
              className="absolute inset-x-0 grid gap-4 pb-4"
              key={index}
              style={{
                top: index * rowHeight,
                height: rowHeight,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {users
                .slice(index * columns, (index + 1) * columns)
                .map((user, offset) => (
                  <div
                    className="h-[180px] min-w-0"
                    role="listitem"
                    aria-setsize={total}
                    aria-posinset={index * columns + offset + 1}
                    key={user.id}
                  >
                    <UserCard user={user} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
      <div className="min-h-[72px] px-3 py-6 text-center text-[11px] text-muted [&_p]:mb-2.5 [&_p]:leading-[1.7]">
        {updating ? (
          <div
            className="flex justify-center"
            role="status"
            aria-label="Updating results"
          >
            <Skeleton className="w-[120px]" />
            {/* <span className="sr-only">Updating results…</span> */}
          </div>
        ) : fetchingNext ? (
          <div className="flex items-center justify-center gap-3" role="status">
            <Skeleton className="w-[90px]" />
            <span className="sr-only">Loading more people…</span>
          </div>
        ) : nextError ? (
          <div role="alert">
            <p>Could not load more people. {nextError.message}</p>
            <Button variant="secondary" size="sm" onClick={loadMore}>
              Retry loading more
            </Button>
          </div>
        ) : hasNextPage ? (
          <Button variant="secondary" size="sm" onClick={loadMore}>
            Load more people
          </Button>
        ) : (
          <p>-- End of the list --</p>
        )}
      </div>
    </div>
  );
}
