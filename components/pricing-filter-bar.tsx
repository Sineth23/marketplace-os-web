"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  emptyPricingFilters,
  pricingFilterQuery,
  type InventoryFilter,
  type PriceFilter,
  type PricingFilters,
} from "../lib/pricing-filters";

type PricingFilterBarProps = Readonly<{
  filters: PricingFilters;
  resultCount: number;
  totalCount: number;
  /** The route the filter links point at. */
  basePath?: string;
}>;

/**
 * The pricing filter bar. Filters live in the URL so a refresh, a shared
 * link, and the browser back button all restore the same view.
 */
export function PricingFilterBar({
  filters,
  resultCount,
  totalCount,
  basePath = "/dashboard/pricing",
}: PricingFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // The URL is the source of truth for the filters. The local state below
  // only exists so the search box can stay responsive while the request is in
  // flight; it is re-synced whenever the URL changes underneath us.
  const [draft, setDraft] = useState(filters);
  const [syncedFilters, setSyncedFilters] = useState(filters);

  if (syncedFilters !== filters) {
    setSyncedFilters(filters);
    setDraft(filters);
  }

  function apply(next: PricingFilters) {
    const query = pricingFilterQuery(next);
    // Any filter change restarts at the first page.
    startTransition(() => {
      router.push(query ? `${basePath}?${query}` : basePath);
    });
  }

  function applySearch(value: string) {
    setDraft((current) => ({ ...current, search: value }));
    apply({ ...filters, search: value });
  }

  function applyPrice(value: PriceFilter) {
    setDraft((current) => ({ ...current, price: value }));
    apply({ ...filters, price: value });
  }

  function applyInventory(value: InventoryFilter) {
    setDraft((current) => ({ ...current, inventory: value }));
    apply({ ...filters, inventory: value });
  }

  function clearFilters() {
    setDraft(emptyPricingFilters);
    apply(emptyPricingFilters);
  }

  const hasFilters = filters.search.trim() !== "" || filters.price !== "all" || filters.inventory !== "all";

  return (
    <div className={`pricing-filter-bar${isPending ? " is-pending" : ""}`}>
      <form
        action={basePath}
        className="catalog-search pricing-filter-search"
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          applySearch(draft.search);
        }}
        role="search"
      >
        <span aria-hidden="true">⌕</span>
        <input
          aria-label="Search pricing"
          name="search"
          onChange={(event) => applySearch(event.target.value)}
          placeholder="Search SKU, manufacturer, or model"
          type="search"
          value={draft.search}
        />
      </form>

      <label className="pricing-filter-select">
        <span className="sr-only">Price filter</span>
        <select
          aria-label="Price filter"
          onChange={(event) => applyPrice(event.target.value as PriceFilter)}
          value={draft.price}
        >
          <option value="all">All prices</option>
          <option value="priced">Priced only</option>
          <option value="unpriced">Unpriced only</option>
        </select>
      </label>

      <label className="pricing-filter-select">
        <span className="sr-only">Inventory filter</span>
        <select
          aria-label="Inventory filter"
          onChange={(event) => applyInventory(event.target.value as InventoryFilter)}
          value={draft.inventory}
        >
          <option value="all">All inventory</option>
          <option value="exclude_fully_sold">Exclude fully sold</option>
          <option value="fully_sold">Fully sold</option>
          <option value="has_available">Has an available unit</option>
        </select>
      </label>

      <button
        className="quiet-button pricing-filter-clear"
        disabled={!hasFilters}
        onClick={clearFilters}
        type="button"
      >
        Clear filters
      </button>

      <p className="pricing-filter-summary" role="status">
        Showing <strong>{resultCount.toLocaleString()}</strong> of{" "}
        <strong>{totalCount.toLocaleString()}</strong> inventory SKUs
      </p>
    </div>
  );
}
