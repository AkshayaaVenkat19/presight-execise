import type { Facets, UserPage } from "../types/directory";

import { PAGE_SIZE } from "../constants/ui";
import { requestJson } from "./http";
export { ApiError } from "./http";

function getJson<T>(
  path: string,
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<T> {
  return requestJson<T>(`${path}?${params}`, { signal });
}

export function getUsers(
  params: URLSearchParams,
  page: number,
  signal: AbortSignal,
): Promise<UserPage> {
  const query = new URLSearchParams(params);
  query.set("page", String(page));
  query.set("limit", String(PAGE_SIZE));
  return getJson<UserPage>("users", query, signal);
}

export async function getFacets(
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<Facets> {
  const result = await getJson<{ data: Facets }>("filters", params, signal);
  return result.data;
}
