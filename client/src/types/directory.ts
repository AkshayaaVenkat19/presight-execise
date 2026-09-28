export const SORT_FIELDS = [
  "first_name",
  "last_name",
  "age",
  "nationality",
] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";
export type DirectoryView = "cards" | "table";

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface DirectoryFilters {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface DirectoryState extends DirectoryFilters {
  sortBy: SortField;
  sortOrder: SortOrder;
  view: DirectoryView;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserPage {
  data: User[];
  pagination: Pagination;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}
