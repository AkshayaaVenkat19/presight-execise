import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { queryClient, retryRequest } from "../api/queryClient";
import { ApiError } from "../api/http";
import { readDirectoryState } from "../utils/directoryState";
import { useDirectoryQueries } from "./useDirectoryQueries";

const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({
    defaultOptions: queryClient.getDefaultOptions(),
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}
const state = readDirectoryState(new URLSearchParams());
function response(input: RequestInfo | URL) {
  return new Response(
    JSON.stringify(
      String(input).startsWith("/api/users")
        ? { data: [], pagination: { page: 1, hasMore: false, total: 0 } }
        : { data: { nationalities: [], hobbies: [] } },
    ),
  );
}
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("shares concurrent requests and reuses fresh results on remount", async () => {
  const { wrapper } = setup();
  const pending: (() => void)[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (input: RequestInfo | URL) =>
        new Promise<Response>((resolve) => {
          pending.push(() => resolve(response(input)));
        }),
    ),
  );
  const first = renderHook(() => useDirectoryQueries(state), { wrapper });
  const second = renderHook(() => useDirectoryQueries(state), { wrapper });
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => pending.forEach((resolve) => resolve()));
  await waitFor(() => expect(second.result.current.users.isSuccess).toBe(true));
  first.unmount();
  second.unmount();
  const third = renderHook(() => useDirectoryQueries(state), { wrapper });
  expect(third.result.current.users.isSuccess).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("cancels obsolete filter requests and remaining requests on unmount", async () => {
  const { wrapper } = setup();
  const signals: AbortSignal[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_input, options: RequestInit) => {
      signals.push(options.signal as AbortSignal);
      return new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    }),
  );
  const hook = renderHook((filters) => useDirectoryQueries(filters), {
    wrapper,
    initialProps: state,
  });
  hook.rerender({ ...state, nationalities: ["Canada"] });
  expect(signals).toHaveLength(4);
  expect(signals.slice(0, 2).every((signal) => signal.aborted)).toBe(true);
  expect(signals.slice(2).every((signal) => !signal.aborted)).toBe(true);
  hook.unmount();
  expect(signals.every((signal) => signal.aborted)).toBe(true);
});

it("keeps cached results visible while stale queries revalidate", async () => {
  const { client, wrapper } = setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => response(input)),
  );
  const hook = renderHook(() => useDirectoryQueries(state), { wrapper });
  await waitFor(() => expect(hook.result.current.facets.isSuccess).toBe(true));
  const data = hook.result.current.users.data;
  vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
  await act(async () => {
    void client.invalidateQueries();
  });
  await waitFor(() => expect(hook.result.current.users.isFetching).toBe(true));
  expect(hook.result.current.users.data).toBe(data);
  expect(hook.result.current.users.isPending).toBe(false);
});

it("retries transient failures once without retrying client errors or cancellation", () => {
  expect(retryRequest(0, new ApiError("Offline", 0))).toBe(true);
  expect(retryRequest(0, new ApiError("Unavailable", 503))).toBe(true);
  expect(retryRequest(1, new ApiError("Unavailable", 503))).toBe(false);
  expect(retryRequest(0, new ApiError("Unauthorized", 401))).toBe(false);
  expect(retryRequest(0, new DOMException("Aborted", "AbortError"))).toBe(
    false,
  );
});

it("requests only the final search after 300 ms without typing", async () => {
  const { wrapper } = setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => response(input)),
  );
  const hook = renderHook((filters) => useDirectoryQueries(filters), {
    wrapper,
    initialProps: state,
  });
  await waitFor(() => expect(hook.result.current.facets.isSuccess).toBe(true));
  vi.mocked(fetch).mockClear();
  vi.useFakeTimers();
  for (const q of ["B", "Be", "Bet", "Beth"]) {
    hook.rerender({ ...state, q });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(fetch).not.toHaveBeenCalled();
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(199);
  });
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  const urls = vi
    .mocked(fetch)
    .mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
  expect(urls.map((url) => url.pathname).sort()).toEqual([
    "/api/filters",
    "/api/users",
  ]);
  expect(urls.every((url) => url.searchParams.get("q") === "Beth")).toBe(true);
  const usersUrl = urls.find((url) => url.pathname === "/api/users")!;
  expect(usersUrl.searchParams.get("page")).toBe("1");
  expect(usersUrl.searchParams.get("limit")).toBe("30");
});

it("does not refetch unchanged or equivalent search input even when cached data is stale", async () => {
  const { client, wrapper } = setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => response(input)),
  );
  const hook = renderHook((filters) => useDirectoryQueries(filters), {
    wrapper,
    initialProps: { ...state, q: "Beth" },
  });
  await waitFor(() => expect(hook.result.current.facets.isSuccess).toBe(true));
  await act(async () => {
    await client.invalidateQueries({ refetchType: "none" });
  });
  vi.mocked(fetch).mockClear();
  vi.useFakeTimers();
  for (const q of ["Beth", " Beth ", "Beth  "]) {
    hook.rerender({ ...state, q });
    expect(hook.result.current.waitingForSearch).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
  }
  hook.rerender({ ...state, q: "Beth", view: "table" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(fetch).not.toHaveBeenCalled();
});

it("aborts the old search immediately and ignores responses arriving after the new search", async () => {
  const { wrapper } = setup();
  const pending: { signal: AbortSignal; resolve: () => void }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (input: RequestInfo | URL, options: RequestInit) =>
        new Promise<Response>((resolve) => {
          const url = new URL(String(input), "http://localhost");
          const q = url.searchParams.get("q");
          // Deliberately ignore abort in this transport to test late-response isolation.
          pending.push({
            signal: options.signal as AbortSignal,
            resolve: () =>
              resolve(
                new Response(
                  JSON.stringify(
                    url.pathname === "/api/users"
                      ? {
                          data: [],
                          pagination: {
                            page: 1,
                            hasMore: false,
                            total: q === "Beth" ? 2 : 1,
                          },
                        }
                      : {
                          data: {
                            nationalities: [],
                            hobbies: [{ value: q, count: 1 }],
                          },
                        },
                  ),
                ),
              ),
          });
        }),
    ),
  );
  const hook = renderHook((filters) => useDirectoryQueries(filters), {
    wrapper,
    initialProps: { ...state, q: "Alex" },
  });
  expect(pending).toHaveLength(2);
  hook.rerender({ ...state, q: "Beth" });
  expect(pending.every(({ signal }) => signal.aborted)).toBe(true);
  expect(pending).toHaveLength(2);
  await waitFor(() => expect(pending).toHaveLength(4));
  await act(async () => pending.slice(2).forEach(({ resolve }) => resolve()));
  await waitFor(() =>
    expect(hook.result.current.users.data?.pages[0].pagination.total).toBe(2),
  );
  await act(async () =>
    pending.slice(0, 2).forEach(({ resolve }) => resolve()),
  );
  expect(hook.result.current.users.data?.pages[0].pagination.total).toBe(2);
  expect(hook.result.current.facets.data?.hobbies[0].value).toBe("Beth");
});
