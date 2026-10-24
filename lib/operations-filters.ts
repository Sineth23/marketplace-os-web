/**
 * Query-string handling shared by the operations screens.
 *
 * The operations screens all filter the same way: a free-text search, a status
 * filter, and one or more dropdown filters. Filters are held in the URL so a
 * refresh, a shared link, and the browser back button all restore the same
 * view.
 */

export type OperationsFilters = Readonly<{
  search: string;
  status: string;
  grade: string;
  location: string;
  channel: string;
  condition: string;
}>;

/** The default filter set: nothing narrowed. */
export const emptyOperationsFilters: OperationsFilters = {
  search: "",
  status: "",
  grade: "",
  location: "",
  channel: "",
  condition: "",
};

/**
 * Reads the filters from a page's search parameters. Unknown status values
 * fall back to the default so a hand-edited link cannot filter on a value the
 * screen does not offer.
 */
export function parseOperationsFilters(params: {
  q?: string | undefined;
  status?: string | undefined;
  grade?: string | undefined;
  location?: string | undefined;
  channel?: string | undefined;
  condition?: string | undefined;
}): OperationsFilters {
  return {
    search: params.q?.trim() ?? "",
    status: params.status?.trim() ?? "",
    grade: params.grade?.trim() ?? "",
    location: params.location?.trim() ?? "",
    channel: params.channel?.trim() ?? "",
    condition: params.condition?.trim() ?? "",
  };
}

/** Builds a query string for a filter set, keeping only the narrowed values. */
export function operationsFilterQuery(
  filters: OperationsFilters,
  extra: Readonly<Record<string, string | undefined>> = {},
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.grade) params.set("grade", filters.grade);
  if (filters.location) params.set("location", filters.location);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.condition) params.set("condition", filters.condition);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** True when any filter narrows the result set. */
export function hasActiveOperationsFilters(filters: OperationsFilters): boolean {
  return Boolean(
    filters.search ||
    filters.status ||
    filters.grade ||
    filters.location ||
    filters.channel ||
    filters.condition,
  );
}

/**
 * Applies the filters to a row set. Each field is matched case-insensitively
 * and a row matches when every set filter matches.
 */
export function applyOperationsFilters<Row>(
  rows: readonly Row[],
  filters: OperationsFilters,
  get: (row: Row) => {
    search: string;
    status?: string | null | undefined;
    grade?: string | null | undefined;
    location?: string | null | undefined;
    channel?: string | null | undefined;
    condition?: string | null | undefined;
  },
): readonly Row[] {
  const search = filters.search.toLowerCase();
  return rows.filter((row) => {
    const fields = get(row);
    if (search) {
      const haystack = fields.search.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.status && (fields.status ?? "") !== filters.status) return false;
    if (filters.grade && (fields.grade ?? "") !== filters.grade) return false;
    if (filters.location && (fields.location ?? "") !== filters.location) return false;
    if (filters.channel && (fields.channel ?? "") !== filters.channel) return false;
    if (filters.condition && (fields.condition ?? "") !== filters.condition) return false;
    return true;
  });
}

/** A page of rows from a filtered set. */
export function paginateOperationsRows<Row>(
  rows: readonly Row[],
  page: number,
  pageLength: number,
): Readonly<{ pageRows: readonly Row[]; pageCount: number; currentPage: number }> {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageLength));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageLength;
  return { pageRows: rows.slice(start, start + pageLength), pageCount, currentPage };
}

/** Reads a page number from a query string, clamping it to a positive integer. */
export function parsePageNumber(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

/** Counts how many rows carry each distinct value of a field. */
export function countBy<Row>(
  rows: readonly Row[],
  get: (row: Row) => string | null | undefined,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = get(row);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** The distinct values of a field, sorted, for a filter dropdown. */
export function distinctValues<Row>(
  rows: readonly Row[],
  get: (row: Row) => string | null | undefined,
): readonly string[] {
  return [...new Set(rows.map(get).filter((value): value is string => Boolean(value)))].sort();
}
