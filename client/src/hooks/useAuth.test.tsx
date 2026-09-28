import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./useAuth";

const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return { client, wrapper };
}
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
});

it("deduplicates concurrent session refreshes and cancels on unmount", async () => {
  const { wrapper } = setup();
  let signal: AbortSignal | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn((_input, options: RequestInit) => {
      signal = options.signal as AbortSignal;
      return new Promise(() => {});
    }),
  );
  const hook = renderHook(useAuth, { wrapper });
  expect(hook.result.current.loading).toBe(true);
  act(() => {
    void hook.result.current.refresh();
    void hook.result.current.refresh();
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  hook.unmount();
  expect(signal!.aborted).toBe(true);
});

it("clears private data on expiration and ignores a late session response", async () => {
  const { client, wrapper } = setup();
  let resolveSession!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveSession = resolve;
        }),
    ),
  );
  client.setQueryData(["users", "cached"], { private: true });
  const hook = renderHook(useAuth, { wrapper });
  act(() => window.dispatchEvent(new Event("session-expired")));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(client.getQueryData(["users", "cached"])).toBeUndefined();
  await act(async () => {
    resolveSession(
      new Response(JSON.stringify({ data: { id: 1, username: "admin" } })),
    );
  });
  expect(hook.result.current.user).toBeNull();
  expect(client.getQueryData(["session"])).toBeNull();
});
