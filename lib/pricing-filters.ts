/**
 * Pricing page filters.
 *
 * The pricing screen lists every catalog SKU but only a small share of them
 * carry a saved price. These filters narrow that list the way the WholeCell
 * pricing view does, using the source `status` field on inventory units
 * (Sold / Available / Unavailable) rather than the Marketplace OS
 * `inventoryState`, so the counts match the source export.
 */

export type PriceFilter = "all" | "priced" | "unpriced";

export type InventoryFilter = "all" | "exclude_fully_sold" | "fully_sold" | "has_available";

export const PRICE_FILTERS = ["all", "priced", "unpriced"] as const;
export const INVENTORY_FILTERS = ["all", "exclude_fully_sold", "fully_sold", "has_available"] as const;

/** Rows per page in the pricing table. */
export const PRICING_PAGE_SIZE = 100;

/**
 * How many price updates the backend accepts in one bulk request. The backend
 * lambda has a 15 second timeout, so a large filtered result set is sent in
 * batches.
 */
export const PRICING_SAVE_BATCH_SIZE = 50;

/** A catalog SKU paired with the pricing and unit-status facts the filters need. */
export type PricingFilterRow = Readonly<{
  id: string;
  sourceSku: string;
  manufacturer: string;
  model: string;
  variant: string;
  network: string;
  capacity: string;
  color: string;
  grade: string;
  damages: string;
  quantity: number;
  /** The saved default price, or null when the SKU has no price row. */
  price: number | null;
  /** How many serialized units this SKU has. */
  unitCount: number;
  /** How many of those units have source status "Sold". */
  soldCount: number;
  /** How many of those units have source status "Available". */
  availableCount: number;
}>;

export type PricingFilters = Readonly<{
  search: string;
  price: PriceFilter;
  inventory: InventoryFilter;
}>;

export const emptyPricingFilters: PricingFilters = {
  search: "",
  price: "all",
  inventory: "all",
};

export function isPriceFilter(value: string | undefined): value is PriceFilter {
  return PRICE_FILTERS.includes((value ?? "") as PriceFilter);
}

export function isInventoryFilter(value: string | undefined): value is InventoryFilter {
  return INVENTORY_FILTERS.includes((value ?? "") as InventoryFilter);
}

export function parsePriceFilter(value: string | undefined): PriceFilter {
  return isPriceFilter(value) ? value : "all";
}

export function parseInventoryFilter(value: string | undefined): InventoryFilter {
  return isInventoryFilter(value) ? value : "all";
}

/**
 * A SKU is fully sold when it has at least one serialized unit and every one
 * of those units has source status "Sold".
 */
export function isFullySold(row: PricingFilterRow): boolean {
  return row.unitCount > 0 && row.soldCount === row.unitCount;
}

/** A SKU has an available unit when at least one unit has source status "Available". */
export function hasAvailableUnit(row: PricingFilterRow): boolean {
  return row.availableCount > 0;
}

export function isPriced(row: PricingFilterRow): boolean {
  return row.price !== null;
}

function matchesSearch(row: PricingFilterRow, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [row.sourceSku, row.manufacturer, row.model].join(" ").toLowerCase().includes(needle);
}

function matchesPrice(row: PricingFilterRow, price: PriceFilter): boolean {
  if (price === "priced") return isPriced(row);
  if (price === "unpriced") return !isPriced(row);
  return true;
}

function matchesInventory(row: PricingFilterRow, inventory: InventoryFilter): boolean {
  if (inventory === "exclude_fully_sold") return !isFullySold(row);
  if (inventory === "fully_sold") return isFullySold(row);
  if (inventory === "has_available") return hasAvailableUnit(row);
  return true;
}

/** Applies every pricing filter. All filters combine with AND semantics. */
export function applyPricingFilters(
  rows: readonly PricingFilterRow[],
  filters: PricingFilters,
): PricingFilterRow[] {
  return rows.filter(
    (row) =>
      matchesSearch(row, filters.search) &&
      matchesPrice(row, filters.price) &&
      matchesInventory(row, filters.inventory),
  );
}

export type PricingPage = Readonly<{
  rows: PricingFilterRow[];
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
}>;

/**
 * Slices the filtered rows into the requested page. The page is clamped to the
 * available range so a stale page number in the URL cannot produce an empty
 * result set.
 */
export function paginatePricingRows(
  filtered: readonly PricingFilterRow[],
  page: number,
  pageSize: number = PRICING_PAGE_SIZE,
): PricingPage {
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  return {
    rows: filtered.slice(start, end),
    page: currentPage,
    pageCount,
    total,
    start: total === 0 ? 0 : start + 1,
    end,
  };
}

/** True when any filter narrows the list away from the default. */
export function hasActivePricingFilters(filters: PricingFilters): boolean {
  return filters.search.trim() !== "" || filters.price !== "all" || filters.inventory !== "all";
}

/**
 * Builds the query string for a filter selection. The page is left out so the
 * caller can decide whether to keep or reset it.
 */
export function pricingFilterQuery(filters: PricingFilters): string {
  const query = new URLSearchParams();
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.price !== "all") query.set("price", filters.price);
  if (filters.inventory !== "all") query.set("inventory", filters.inventory);
  return query.toString();
}
