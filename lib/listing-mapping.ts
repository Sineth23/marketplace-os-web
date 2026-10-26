/**
 * The provider listing mapping model.
 *
 * A provider's sku and the tenant's catalog sku are different vocabularies, so
 * a listing only becomes comparable once a reviewed mapping links them. This
 * module holds the mapping state and the rules for what a mapping may be, and
 * it keeps the unlinked and rejected cases distinct from a linked one.
 */

import type { ListingRow } from "./listing-rows";

/** How a provider listing relates to the tenant's catalog. */
export type MappingState =
  /** The listing maps to a catalog sku, and the mapping has been reviewed. */
  | "linked"
  /** The listing has no mapping yet. */
  | "unlinked"
  /** The listing was reviewed and deliberately left unmapped. */
  | "rejected";

/** A listing with its mapping state. */
export type MappingRow = Readonly<{
  listing: ListingRow;
  state: MappingState;
  /** The catalog sku the listing maps to, when it is linked. */
  catalogSku: string | null;
  /** The catalog skus the provider title or sku most resembles. */
  candidates: readonly string[];
}>;

/**
 * Pulls the informative tokens out of a provider sku.
 *
 * A composed sku has no separators, so the whole string would be one token and
 * nothing would ever resemble anything. The token list therefore includes both
 * the whole sku and its digit-delimited parts, so a catalogue sku that shares
 * the model and storage is a candidate even when the grade suffix differs.
 */
/**
 * Pulls the informative tokens out of a provider sku.
 *
 * A composed sku has no separators, so the whole string would be one token and
 * nothing would ever resemble anything. The parts are therefore split on the
 * letter and digit boundaries inside the sku.
 */
function skuParts(value: string): readonly string[] {
  return value
    .toUpperCase()
    .split(/(?<=[A-Z])(?=\d)|(?<=\d)(?=[A-Z])/)
    .filter((part) => part.length >= 2);
}

/**
 * Scores how alike two skus are.
 *
 * The score counts the parts they share, but only the parts that carry
 * meaning. A storage size like 256 appears in almost every catalogue, so a
 * match on it alone means nothing, and a part that is only digits or only
 * letters is too generic to carry a match either. The score therefore weights
 * a shared model or device code above a shared size, and a match on a generic
 * part alone is not enough.
 */
function similarity(providerSku: string, catalogSku: string): number {
  const providerParts = skuParts(providerSku);
  const catalogParts = new Set(skuParts(catalogSku));
  if (providerParts.length === 0) return 0;

  let score = 0;
  let genericMatches = 0;
  for (const part of providerParts) {
    if (!catalogParts.has(part)) continue;
    const isGeneric = /^\d+$/.test(part) || /^[A-Z]{2,3}$/.test(part);
    if (isGeneric) {
      genericMatches += 1;
      continue;
    }
    score += part.length;
  }

  // A device family on its own is not enough; the model has to match too.
  if (score === 0) return genericMatches >= 2 ? 1 : 0;
  return score;
}

/**
 * Suggests catalog skus for an unmapped listing.
 *
 * The suggestion is a convenience for the operator, not a decision. A mapping is
 * only made when the operator chooses one, because a wrong mapping would make
 * a provider's quantity look like the tenant's own stock for the wrong product.
 *
 * The comparison is deliberately conservative. It looks for the provider sku
 * itself, and for a catalogue sku that shares the provider's distinctive
 * parts, because the two catalogues rarely share a format.
 */
export function suggestCatalogSkus(
  listing: ListingRow,
  catalogSkus: readonly string[],
  limit = 5,
): readonly string[] {
  const providerSku = listing.providerSku?.trim().toUpperCase() ?? "";
  const title = listing.title.trim().toUpperCase();
  if (!providerSku && !title) return [];

  const scored = catalogSkus
    .map((sku) => {
      const upper = sku.toUpperCase();
      const score = similarity(providerSku, upper);
      return { sku, score, exact: upper === providerSku };
    })
    .filter((entry) => entry.exact || entry.score > 0)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || a.sku.localeCompare(b.sku));

  return scored.slice(0, limit).map((entry) => entry.sku);
}

/**
 * Builds the mapping rows for a set of listings.
 *
 * `existingMappings` is keyed by provider and provider sku, because a provider
 * sku is the provider's own identifier and a listing id is not portable
 * between reads.
 */
export function buildMappingRows(
  listings: readonly ListingRow[],
  existingMappings: ReadonlyMap<string, string>,
  catalogSkus: readonly string[],
): readonly MappingRow[] {
  return listings.map((listing) => {
    const mappingKey = `${listing.provider}:${listing.providerSku ?? listing.externalId ?? listing.key}`;
    const mapped = existingMappings.get(mappingKey) ?? null;
    if (mapped) {
      return {
        listing,
        state: "linked",
        catalogSku: mapped,
        candidates: [mapped],
      };
    }
    return {
      listing,
      state: "unlinked",
      catalogSku: null,
      candidates: suggestCatalogSkus(listing, catalogSkus),
    };
  });
}

/** The summary counts for the mapping screen. */
export type MappingSummary = Readonly<{
  total: number;
  linked: number;
  unlinked: number;
  rejected: number;
  /** Unmapped listings that have at least one suggestion. */
  withSuggestions: number;
}>;

/** Summarizes the mapping rows. */
export function summarizeMappings(rows: readonly MappingRow[]): MappingSummary {
  let linked = 0;
  let unlinked = 0;
  let rejected = 0;
  let withSuggestions = 0;
  for (const row of rows) {
    if (row.state === "linked") linked += 1;
    else if (row.state === "rejected") rejected += 1;
    else {
      unlinked += 1;
      if (row.candidates.length > 0) withSuggestions += 1;
    }
  }
  return { total: rows.length, linked, unlinked, rejected, withSuggestions };
}
