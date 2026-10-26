/**
 * A provider-agnostic view of what is listed where.
 *
 * Each provider reports listings in its own shape and its own vocabulary, so this
 * module reduces them to one comparable row. The reduction keeps the provider's
 * own identifiers and raw state, and it never turns a missing value into a
 * number: a provider that did not report a quantity produces an unknown, which
 * is not the same as zero.
 */

import type {
  BestBuyOffer,
  BestBuyOffersResponse,
  EbayListing,
  EbayListingsResponse,
  ReebeloOffer,
  ReebeloOffersResponse,
} from "./api";

/** The providers this view can show. */
export type ListingProvider = "ebay" | "amazon" | "bestbuy" | "reebelo";

/** The provider's own display name. */
export const providerLabels: Readonly<Record<ListingProvider, string>> = {
  ebay: "eBay",
  amazon: "Amazon",
  bestbuy: "Best Buy",
  reebelo: "Reebelo",
};

/** The state a listing is in, as this view describes it. */
export type ListingState = "active" | "inactive" | "incomplete" | "suppressed" | "unknown";

/** One listing, reduced to a shape every provider can be shown in. */
export type ListingRow = Readonly<{
  /** A stable key for the row within its provider. */
  key: string;
  provider: ListingProvider;
  /** The provider's own identifier for the listing. */
  externalId: string | null;
  /** The provider's own sku, verbatim. Never normalized. */
  providerSku: string | null;
  title: string;
  /** The state this view derived. */
  state: ListingState;
  /** The provider's raw state, preserved as returned. */
  rawState: string | null;
  /** Why the state was derived that way, in words. */
  stateReason: string | null;
  /** The quantity the provider reported, or null when it did not report one. */
  quantity: number | null;
  price: number | null;
  currency: string | null;
  /** The marketplace or channel the listing is on, when the provider reports one. */
  channel: string | null;
  /** The catalog sku this listing maps to, when a mapping exists. */
  catalogSku: string | null;
  /** When the provider was read. */
  observedAt: string;
}>;

/** What a provider read produced, including the case where it could not be read. */
export type ProviderListingResult = Readonly<{
  provider: ListingProvider;
  /** False when the provider could not be read. */
  available: boolean;
  /** The reason the provider could not be read. */
  unavailableReason: string | null;
  /** When the provider was read, or null when it could not be read. */
  fetchedAt: string | null;
  /** Whether the provider reported more listings than were read. */
  truncated: boolean;
  /** The provider's own note about what it covers. */
  coverage: string | null;
  rows: readonly ListingRow[];
}>;

/** A read that failed, with the reason. */
export type ProviderReadFailure = Readonly<{
  provider: ListingProvider;
  reason: string;
}>;

function normalizeState(state: string | null | undefined): ListingState {
  const value = (state ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  if (value === "active" || value === "buyable" || value === "published") return "active";
  if (value === "inactive" || value === "not_buyable" || value === "paused") return "inactive";
  if (value === "incomplete" || value === "missing_info") return "incomplete";
  if (value === "suppressed") return "suppressed";
  return "unknown";
}

/** Reduces eBay listings to the shared row shape. */
export function toEbayRows(response: EbayListingsResponse): readonly ListingRow[] {
  return response.listings.map((listing: EbayListing) => ({
    key: `${listing.listingId ?? listing.sku ?? "unknown"}:${listing.source}`,
    provider: "ebay",
    externalId: listing.listingId,
    providerSku: listing.sku,
    title: listing.title,
    state: normalizeState(listing.listingStatus),
    rawState: listing.listingStatus,
    stateReason: listing.source,
    quantity: listing.channelQuantity,
    price: listing.price ? Number(listing.price.amount) : null,
    currency: listing.price?.currency ?? null,
    channel: listing.marketplaceId,
    catalogSku: null,
    observedAt: listing.observedAt,
  }));
}

/** Reduces Best Buy offers to the shared row shape. */
export function toBestBuyRows(response: BestBuyOffersResponse): readonly ListingRow[] {
  return response.offers.map((offer: BestBuyOffer) => ({
    key: offer.offerId ?? offer.sku ?? "unknown",
    provider: "bestbuy",
    externalId: offer.offerId,
    providerSku: offer.sku,
    title: offer.title,
    state: normalizeState(offer.listingStatus),
    rawState: offer.listingStatus,
    stateReason: offer.providerState.stateCode
      ? `state ${offer.providerState.stateCode}`
      : offer.providerState.active === null
        ? "not reported"
        : null,
    quantity: offer.quantity,
    price: offer.price,
    currency: offer.currency,
    channel: offer.categoryCode,
    catalogSku: null,
    observedAt: response.fetchedAt,
  }));
}

/** Reduces Reebelo offers to the shared row shape. */
export function toReebeloRows(response: ReebeloOffersResponse): readonly ListingRow[] {
  return response.offers.map((offer: ReebeloOffer) => ({
    key: offer.sku ?? "unknown",
    provider: "reebelo",
    externalId: offer.url,
    providerSku: offer.sku,
    title: offer.title,
    state: normalizeState(offer.displayState),
    rawState: offer.rawStatus,
    stateReason: offer.displayReason,
    quantity: offer.quantity,
    price: offer.price ?? offer.reebeloPrice,
    currency: null,
    channel: offer.category,
    catalogSku: null,
    observedAt: offer.updatedAt ?? response.fetchedAt,
  }));
}

/** Builds the result for a provider that could not be read. */
export function unavailableProvider(provider: ListingProvider, reason: string): ProviderListingResult {
  return {
    provider,
    available: false,
    unavailableReason: reason,
    fetchedAt: null,
    truncated: false,
    coverage: null,
    rows: [],
  };
}

/** Builds the result for a provider that was read. */
export function availableProvider(
  provider: ListingProvider,
  rows: readonly ListingRow[],
  options: {
    fetchedAt: string;
    truncated: boolean;
    coverage?: string | null;
  },
): ProviderListingResult {
  return {
    provider,
    available: true,
    unavailableReason: null,
    fetchedAt: options.fetchedAt,
    truncated: options.truncated,
    coverage: options.coverage ?? null,
    rows,
  };
}

/** The summary counts for the view. */
export type ListingSummary = Readonly<{
  /** Providers that were read. */
  readableProviders: number;
  /** Providers that could not be read. */
  unavailableProviders: number;
  totalListings: number;
  /** Listings whose sku maps to a catalog sku. */
  linkedListings: number;
  /** Listings with no mapping. */
  unlinkedListings: number;
  /** Listings where the provider reported a quantity. */
  withQuantity: number;
  /** Listings where the provider reported no quantity. This is not zero. */
  withoutQuantity: number;
  /** Listings whose provider quantity differs from the tenant's available count. */
  mismatchedListings: number;
}>;

/**
 * Summarizes the providers for the view header.
 *
 * A listing is linked when it has a catalog sku, and a quantity is only counted
 * when the provider reported one. A listing with no reported quantity is counted
 * separately, because it is an unknown rather than a zero.
 */
export function summarizeListings(
  providers: readonly ProviderListingResult[],
  tenantQuantityByCatalogSku: ReadonlyMap<string, number>,
): ListingSummary {
  const rows = providers.flatMap((provider) => provider.rows);
  let linked = 0;
  let withQuantity = 0;
  let withoutQuantity = 0;
  let mismatched = 0;
  for (const row of rows) {
    if (row.catalogSku) linked += 1;
    else continue;
    if (row.quantity === null) {
      withoutQuantity += 1;
      continue;
    }
    withQuantity += 1;
    const ours = tenantQuantityByCatalogSku.get(row.catalogSku);
    if (ours !== undefined && ours !== row.quantity) mismatched += 1;
  }
  return {
    readableProviders: providers.filter((provider) => provider.available).length,
    unavailableProviders: providers.filter((provider) => !provider.available).length,
    totalListings: rows.length,
    linkedListings: linked,
    unlinkedListings: rows.length - linked,
    withQuantity,
    withoutQuantity,
    mismatchedListings: mismatched,
  };
}

/**
 * How a listing compares with the tenant's own available count.
 *
 * The three outcomes are distinct on purpose. A provider that reported no
 * quantity is unknown, and is never reported as a mismatch of zero.
 */
export type ListingComparison =
  | Readonly<{ kind: "match"; tenantQuantity: number }>
  | Readonly<{ kind: "mismatch"; tenantQuantity: number; difference: number }>
  | Readonly<{ kind: "provider-unknown" }>
  | Readonly<{ kind: "unlinked" }>;

export function compareListing(
  row: ListingRow,
  tenantQuantityByCatalogSku: ReadonlyMap<string, number>,
): ListingComparison {
  if (!row.catalogSku) return { kind: "unlinked" };
  const tenantQuantity = tenantQuantityByCatalogSku.get(row.catalogSku);
  if (tenantQuantity === undefined) return { kind: "unlinked" };
  if (row.quantity === null) return { kind: "provider-unknown" };
  if (row.quantity === tenantQuantity) return { kind: "match", tenantQuantity };
  return {
    kind: "mismatch",
    tenantQuantity,
    difference: row.quantity - tenantQuantity,
  };
}
