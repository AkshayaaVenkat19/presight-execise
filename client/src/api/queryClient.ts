import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./http";

export function retryRequest(failureCount: number, error: Error): boolean {
  if (error.name === "AbortError") return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500)
    return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: retryRequest,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // Retain inactive results for return navigation.
    },
  },
});
