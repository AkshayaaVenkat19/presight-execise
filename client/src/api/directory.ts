import type { Facets, UserPage } from "../types/directory";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(
  path: string,
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/${path}?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    let message = "The directory is unavailable. Please try again.";
    try {
      const body = await response.json();
      if (typeof body.error?.message === "string") message = body.error.message;
    } catch {
      // Reverse proxies can return non-JSON errors; keep a useful fallback.
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export function getUsers(
  params: URLSearchParams,
  page: number,
  signal: AbortSignal,
): Promise<UserPage> {
  const query = new URLSearchParams(params);
  query.set("page", String(page));
  query.set("limit", "30");
  return getJson<UserPage>("users", query, signal);
}

export async function getFacets(
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<Facets> {
  const result = await getJson<{ data: Facets }>("filters", params, signal);
  return result.data;
}
