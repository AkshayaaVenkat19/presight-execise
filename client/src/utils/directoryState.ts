import {
  SORT_FIELDS,
  type DirectoryFilters,
  type DirectoryState,
} from "../types/directory";

function readList(params: URLSearchParams, key: string): string[] {
  return [
    ...new Set(
      params
        .getAll(key)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort();
}

export function readDirectoryState(params: URLSearchParams): DirectoryState {
  const sortBy = params.get("sortBy");
  return {
    q: params.get("q") ?? "",
    nationalities: readList(params, "nationality"),
    hobbies: readList(params, "hobby"),
    sortBy: SORT_FIELDS.find((field) => field === sortBy) ?? "first_name",
    sortOrder:
      params.get("sortOrder")?.toLowerCase() === "desc" ? "desc" : "asc",
    view: params.get("view") === "table" ? "table" : "cards",
  };
}

export function filterParams(filters: DirectoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  const q = filters.q
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (q) params.set("q", q);
  filters.nationalities.forEach((value) => params.append("nationality", value));
  filters.hobbies.forEach((value) => params.append("hobby", value));
  return params;
}

export function writeDirectoryState(
  current: URLSearchParams,
  patch: Partial<DirectoryState>,
): URLSearchParams {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    const queryKey =
      key === "nationalities"
        ? "nationality"
        : key === "hobbies"
          ? "hobby"
          : key;
    params.delete(queryKey);
    if (Array.isArray(value)) {
      [...new Set(value)]
        .sort()
        .forEach((entry) => params.append(queryKey, entry));
    } else if (value !== "") {
      params.set(queryKey, String(value));
    }
  }
  return params;
}
