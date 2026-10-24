import Link from "next/link";

import { countBy, distinctValues, type OperationsFilters } from "../lib/operations-filters";

/**
 * The filter bar shared by the operations screens.
 *
 * Filters are plain links so the browser back button, a refresh, and a shared
 * URL all restore the same view, and so the page works without client-side
 * scripting.
 */

export type FilterOption = Readonly<{ value: string; label: string; count?: number }>;

export type OperationsFilterBarProps = Readonly<{
  /** The path the filters apply to, without a query string. */
  basePath: string;
  /** The current filter set, used to mark the active option. */
  filters: OperationsFilters;
  /** The current query string, so a change to one filter keeps the others. */
  query: string;
  /** The dropdowns to show. */
  selects: readonly Readonly<{
    name: string;
    label: string;
    options: readonly FilterOption[];
  }>[];
  /** The result count, for the summary line. */
  resultCount: number;
  /** The count before filtering, so the summary can say how much was narrowed. */
  totalCount: number;
}>;

function withParam(query: string, name: string, value: string): string {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  if (value) params.set(name, value);
  else params.delete(name);
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function OperationsFilterBar({
  basePath,
  filters,
  query,
  selects,
  resultCount,
  totalCount,
}: OperationsFilterBarProps) {
  const narrowed = resultCount !== totalCount;
  return (
    <div className="operations-toolbar">
      <form className="operations-search" action={basePath} method="get">
        {selects
          .filter((select) => filters[select.name as keyof OperationsFilters])
          .map((select) => (
            <input
              key={select.name}
              type="hidden"
              name={select.name}
              value={filters[select.name as keyof OperationsFilters] as string}
            />
          ))}
        <input
          type="search"
          name="q"
          defaultValue={filters.search}
          placeholder="Search"
          aria-label="Search"
        />
        <button className="quiet-button" type="submit">
          Search
        </button>
      </form>
      <div className="operations-filters">
        {selects.map((select) => {
          const active = filters[select.name as keyof OperationsFilters] as string;
          return (
            <details className="operations-filter" key={select.name}>
              <summary>
                {select.label}
                {active ? <span className="filter-active">{active}</span> : null}
              </summary>
              <div className="operations-filter-options">
                <Link
                  className={`operations-filter-option ${active ? "" : "active"}`}
                  href={`${basePath}${withParam(query, select.name, "")}`}
                >
                  All
                </Link>
                {select.options.map((option) => (
                  <Link
                    className={`operations-filter-option ${active === option.value ? "active" : ""}`}
                    href={`${basePath}${withParam(query, select.name, option.value)}`}
                    key={option.value}
                  >
                    {option.label}
                    {option.count === undefined ? null : <span className="filter-count">{option.count}</span>}
                  </Link>
                ))}
              </div>
            </details>
          );
        })}
        {narrowed ? (
          <Link className="quiet-button" href={basePath}>
            Clear filters
          </Link>
        ) : null}
      </div>
      <p className="operations-summary">
        {resultCount.toLocaleString()} of {totalCount.toLocaleString()} shown
      </p>
    </div>
  );
}

/** Builds the filter options for a field, with counts. */
export function filterOptions<Row>(
  rows: readonly Row[],
  get: (row: Row) => string | null | undefined,
): readonly FilterOption[] {
  const counts = countBy(rows, get);
  return distinctValues(rows, get).map((value) => ({
    value,
    label: value,
    count: counts.get(value) ?? 0,
  }));
}
