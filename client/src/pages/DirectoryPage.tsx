import { useDirectoryState } from "../hooks/useDirectoryState";
import { useDirectoryQueries } from "../hooks/useDirectoryQueries";
import type { SortField } from "../types/directory";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { ViewToggle } from "../components/ui/ViewToggle";
import { FilterSidebar } from "../components/directory/FilterSidebar";
import { VirtualUserList } from "../components/directory/VirtualUserList";
import { DirectorySkeleton, Skeleton } from "../components/feedback/Skeleton";
import { StatusPanel } from "../components/feedback/StatusPanel";

export function DirectoryPage() {
  const { state, update, toggle, clearFilters } = useDirectoryState();
  const { users, facets, waitingForSearch, userKey } =
    useDirectoryQueries(state);
  const people = users.data?.pages.flatMap((page) => page.data) ?? [];
  const total = users.data?.pages[0]?.pagination.total ?? 0;
  const loading = users.isPending;
  const updating =
    waitingForSearch ||
    users.isPlaceholderData ||
    (users.isFetching && !users.isFetchingNextPage);
  const activeFilters = [
    ...state.nationalities.map((value) => ({
      kind: "nationalities" as const,
      value,
    })),
    ...state.hobbies.map((value) => ({ kind: "hobbies" as const, value })),
  ];
  const chipClasses =
    "inline-flex max-w-full items-center gap-[7px] rounded-[7px] bg-accent-soft px-[9px] py-1.5 text-[11px] wrap-anywhere text-accent";
  const textButtonClasses =
    "bg-transparent p-1 text-xs font-semibold text-accent hover:underline";

  return (
    <>
      <section className="mb-[clamp(8px,2dvh,24px)] flex max-h-[20%] shrink-0 items-start justify-between gap-5 overflow-auto">
        <div>
          <h1 className="mt-0 mb-2 text-3xl leading-tight font-bold tracking-[-1.4px]">
            Users Directory
          </h1>
          <p className="text-xs leading-relaxed text-muted tablet:text-sm">
            Explore the directory. Uncover shared interests and endless
            connections
          </p>
        </div>
      </section>
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-3 tablet:grid-cols-[224px_minmax(0,1fr)] tablet:grid-rows-[minmax(0,1fr)] tablet:gap-5 desktop:grid-cols-[252px_minmax(0,1fr)] desktop:gap-7">
        <FilterSidebar
          state={state}
          facets={facets.data}
          loading={facets.isPending}
          error={facets.error}
          retry={() => {
            void facets.refetch();
          }}
          toggle={toggle}
          clear={clearFilters}
        />
        <section
          className="flex min-h-0 min-w-0 flex-col"
          aria-label="Directory results"
          aria-busy={loading || updating}
        >
          <div className="scrollbar-thin max-h-[50%] shrink-0 overflow-auto">
            <div className="flex flex-wrap items-center gap-3 tablet:gap-3.5">
              <div className="flex min-h-[46px] flex-[1_1_100%] items-center gap-2.5 rounded-[10px] border border-border bg-surface px-3.5 text-muted focus-within:border-accent tablet:flex-[1_1_260px]">
                <Icon name="search" />
                <label className="sr-only" htmlFor="directory-search">
                  Search by first or last name
                </label>
                <Input
                  id="directory-search"
                  type="search"
                  placeholder="Search by first or last name…"
                  maxLength={100}
                  value={state.q}
                  onChange={(event) => update({ q: event.target.value }, true)}
                />
                {state.q && (
                  <button
                    className="bg-transparent p-[5px] text-muted"
                    type="button"
                    aria-label="Clear search"
                    onClick={() => update({ q: "" }, true)}
                  >
                    <Icon name="close" width="16" height="16" />
                  </button>
                )}
              </div>
              <div className="flex w-full items-center gap-2 text-[11px] text-muted tablet:w-auto">
                <label className="whitespace-nowrap" htmlFor="sort-field">
                  Sort by
                </label>
                <Select
                  wrapperClassName="flex-1 tablet:max-w-40 tablet:flex-none"
                  id="sort-field"
                  value={state.sortBy}
                  onValueChange={(value) =>
                    update({ sortBy: value as SortField })
                  }
                  options={[
                    { value: "first_name", label: "First name" },
                    { value: "last_name", label: "Last name" },
                    { value: "age", label: "Age" },
                    { value: "nationality", label: "Nationality" },
                  ]}
                />
                <button
                  type="button"
                  className="flex size-11 shrink-0 items-center justify-center rounded-[9px] border border-border bg-surface text-black/70 hover:border-accent hover:bg-accent-soft"
                  aria-label="Sort descending"
                  aria-pressed={state.sortOrder === "desc"}
                  title={
                    state.sortOrder === "asc"
                      ? "Ascending — switch to descending"
                      : "Descending — switch to ascending"
                  }
                  onClick={() =>
                    update({
                      sortOrder: state.sortOrder === "asc" ? "desc" : "asc",
                    })
                  }
                >
                  <Icon
                    name={
                      state.sortOrder === "asc"
                        ? "sort-ascending"
                        : "sort-descending"
                    }
                  />
                </button>
              </div>
            </div>
            {(activeFilters.length > 0 || state.q) && (
              <div
                className="mt-4 flex flex-wrap items-center gap-[7px]"
                aria-label="Active filters"
              >
                {state.q && (
                  <button
                    type="button"
                    className={chipClasses}
                    onClick={() => update({ q: "" })}
                    aria-label={`Remove search ${state.q}`}
                  >
                    Search: {state.q}
                    <Icon name="close" width="14" height="14" />
                  </button>
                )}
                {activeFilters.map(({ kind, value }) => (
                  <button
                    type="button"
                    className={chipClasses}
                    key={`${kind}:${value}`}
                    onClick={() => toggle(kind, value)}
                    aria-label={`Remove ${kind === "hobbies" ? "hobby" : "nationality"} ${value}`}
                  >
                    <span className="truncate">{value}</span>
                    <Icon name="close" width="14" height="14" />
                  </button>
                ))}
                <button
                  className={textButtonClasses}
                  type="button"
                  onClick={clearFilters}
                >
                  Clear all
                </button>
              </div>
            )}
            <div className="mt-3 mb-3 flex items-center justify-between gap-3">
              <div
                className="flex flex-wrap items-center gap-1 text-xs text-muted"
                role="status"
                aria-live="polite"
              >
                {loading ? (
                  <Skeleton className="w-[90px]" />
                ) : users.isError && !users.data ? (
                  "Results unavailable"
                ) : (
                  <>
                    <strong className="font-semibold text-text">
                      {total.toLocaleString()}
                    </strong>{" "}
                    people
                    <span className="hidden tablet:inline">
                      {state.q || activeFilters.length
                        ? " matching your filters"
                        : " in the directory"}
                    </span>
                  </>
                )}
                {updating && !loading && (
                  <span className="ml-2">
                    <Skeleton className="w-[70px]" />
                    <span className="sr-only">Updating…</span>
                  </span>
                )}
              </div>
              <ViewToggle
                view={state.view}
                onChange={(view) => update({ view })}
              />
            </div>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
            {users.isRefetchError && (
              <div
                className="shrink-0 mb-3 rounded-lg bg-danger-soft p-3 text-xs text-danger"
                role="alert"
              >
                Could not refresh the directory. Showing previously loaded
                results.{" "}
                <button
                  className={textButtonClasses}
                  type="button"
                  onClick={() => {
                    void users.refetch();
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <DirectorySkeleton table={state.view === "table"} />
            ) : users.isError && !users.data ? (
              <StatusPanel
                error
                title="Couldn’t load the directory"
                message={users.error.message}
              >
                <Button
                  onClick={() => {
                    void users.refetch();
                  }}
                >
                  Try again
                </Button>
                <Button variant="secondary" onClick={clearFilters}>
                  Reset filters
                </Button>
              </StatusPanel>
            ) : people.length === 0 ? (
              <StatusPanel
                title="No people found"
                message="Try a different name or remove a filter to broaden your search."
              >
                <Button onClick={clearFilters}>Clear filters</Button>
              </StatusPanel>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <VirtualUserList
                  key={`${userKey}:${state.view}`}
                  users={people}
                  total={total}
                  view={state.view}
                  hasNextPage={users.hasNextPage}
                  updating={updating}
                  fetchingNext={users.isFetchingNextPage}
                  nextError={users.isFetchNextPageError ? users.error : null}
                  loadMore={() => {
                    if (!updating && users.hasNextPage)
                      void users.fetchNextPage({ cancelRefetch: false });
                  }}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
