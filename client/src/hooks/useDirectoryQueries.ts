import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { getFacets, getUsers } from "../api/directory";
import type { DirectoryState } from "../types/directory";
import { filterParams } from "../utils/directoryState";
import { useDebouncedValue } from "./useDebouncedValue";

export function useDirectoryQueries(state: DirectoryState) {
  const debouncedText = useDebouncedValue(state.q);
  const waitingForSearch = debouncedText !== state.q;
  const filters = filterParams(state);
  const filterKey = filters.toString();
  const userParams = new URLSearchParams(filters);
  userParams.set("sortBy", state.sortBy);
  userParams.set("sortOrder", state.sortOrder);
  const userKey = userParams.toString();

  const users = useInfiniteQuery({
    queryKey: ["users", userKey],
    queryFn: ({ pageParam, signal }) =>
      getUsers(new URLSearchParams(userKey), pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled: !waitingForSearch,
  });

  const facets = useQuery({
    queryKey: ["facets", filterKey],
    queryFn: ({ signal }) => getFacets(new URLSearchParams(filterKey), signal),
    placeholderData: keepPreviousData,
    enabled: !waitingForSearch,
  });

  return { users, facets, waitingForSearch, userKey };
}
