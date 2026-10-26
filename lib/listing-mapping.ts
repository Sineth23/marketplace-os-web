/**
 * The provider listing mapping model.
 *
 * A provider's sku and the tenant's catalogue sku are different vocabularies, so
 * a listing only becomes comparable with the tenant's own stock once a reviewed
 * mapping links them. This module holds the mapping state and the rules for what
 * a mapping may be, and it keeps the unlinked and rejected cases distinct from a
 * linked one.
 *
 * The catalogue grain is a sku together with its grade and conditions. Two
 * catalogue records can share a sku and differ by grade, so a mapping that
 * ignores the grade would claim that a seller's B Grade listing is the same
 * product as the tenant's A Grade stock.
 */

import type { ListingRow } from "./listing-rows";

/** How a provider listing relates to the tenant's catalogue. */
export type MappingState =
  /** The listing maps to a catalogue record, and the mapping has been reviewed. */
  | "linked"
  /** The listing has no mapping yet. */
  | "unlinked"
  /** The listing was reviewed and deliberately left unmapped. */
  | "rejected";

/** A catalogue record a provider listing could be matched to. */
export type CatalogRecord = Readonly<{
  /** The tenant's sku. */
  sku: string;
  /** The grade, when the catalogue record has one. */
  grade?: string | null | undefined;
  /** The conditions or damages, when the catalogue record has them. */
  conditions?: string | null | undefined;
  /** How many units of this record the tenant holds. */
  quantity?: number | null | undefined;
}>;

/** A candidate match for an unmapped listing. */
export type CatalogSuggestion = Readonly<{
  record: CatalogRecord;
  /** How alike the provider listing and the catalogue record are. */
  score: number;
  /** True when the grade also agrees. */
  gradeAgrees: boolean;
}>;

/** A listing with its mapping state. */
export type MappingRow = Readonly<{
  listing: ListingRow;
  state: MappingState;
  /** The catalogue sku the listing maps to, when it is linked. */
  catalogSku: string | null;
  /** The catalogue skus the provider title or sku most resembles. */
  candidates: readonly CatalogSuggestion[];
}>;

/**
 * Pulls the informative parts out of a composed sku.
 *
 * A composed sku has no separators, so the whole string would be one part and
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
 * Compares a grade from a provider listing with a grade on a catalogue record.
 *
 * The provider reports grades in its own vocabulary, so a comparison that is
 * too strict would reject a correct match. The comparison therefore accepts a
 * grade that is absent on either side, because a listing with no grade is not
 * evidence of a different grade, and it accepts a shared leading word so
 * "A Grade" and "A" agree, and "B Grade" and "B" agree.
 */
export function gradesAgree(
  providerGrade: string | null | undefined,
  catalogGrade: string | null | undefined,
): boolean {
  const provider = providerGrade?.trim().toLowerCase();
  const catalog = catalogGrade?.trim().toLowerCase();
  if (!provider || !catalog) return true;
  if (provider === catalog) return true;
  const providerWord = provider.split(/\s+/)[0] ?? "";
  const catalogWord = catalog.split(/\s+/)[0] ?? "";
  return providerWord.length > 0 && providerWord === catalogWord;
}

/**
 * Suggests catalogue records for an unmapped listing.
 *
 * The suggestion is a convenience for the operator, not a decision. A mapping is
 * only made when the operator chooses one, because a wrong mapping would make
 * a provider's quantity look like the tenant's own stock for the wrong product.
 *
 * The comparison is deliberately conservative. It looks for the provider sku
 * itself, and for a catalogue sku that shares the provider's distinctive
 * parts, because the two catalogues rarely share a format.
 *
 * A record whose grade disagrees with the provider's is ranked below one that
 * agrees, and it is kept in the list so the operator can still see it.
 */
export function suggestCatalogRecords(
  listing: ListingRow,
  catalog: readonly CatalogRecord[],
  limit = 8,
): readonly CatalogSuggestion[] {
  const providerSku = listing.providerSku?.trim().toUpperCase() ?? "";
  const providerGrade = providerGradeOf(listing);
  if (!providerSku) return [];

  const scored = catalog
    .map((record) => {
      const score = similarity(providerSku, record.sku.toUpperCase());
      if (score === 0) return null;
      const gradeAgrees = gradesAgree(providerGrade, record.grade);
      return { record, score, gradeAgrees };
    })
    .filter((entry): entry is CatalogSuggestion => entry !== null)
    .sort(
      (a, b) =>
        Number(b.gradeAgrees) - Number(a.gradeAgrees) ||
        b.score - a.score ||
        a.record.sku.localeCompare(b.record.sku),
    );

  return scored.slice(0, limit);
}

/**
 * The grade the provider reported for a listing.
 *
 * The provider adapters derive a display state rather than a grade for most
 * listings, so the grade is taken from the raw state and the reason when one is
 * available.
 */
export function providerGradeOf(listing: ListingRow): string | undefined {
  const raw = listing.rawState?.trim();
  if (!raw) return undefined;
  const match = /([A-Z]\s*Grade|New|Open Box|Refurbished|Used)/i.exec(raw);
  return match?.[1];
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
  catalog: readonly CatalogRecord[],
): readonly MappingRow[] {
  return listings.map((listing) => {
    const mappingKey = `${listing.provider}:${listing.providerSku ?? listing.externalId ?? listing.key}`;
    const mapped = existingMappings.get(mappingKey) ?? null;
    if (mapped) {
      return {
        listing,
        state: "linked",
        catalogSku: mapped,
        candidates: [],
      };
    }
    return {
      listing,
      state: "unlinked",
      catalogSku: null,
      candidates: suggestCatalogRecords(listing, catalog),
    };
  });
}

/**
 * Keeps only the listings that could plausibly match the tenant's own
 * inventory.
 *
 * A provider account carries a large published catalogue, and most of it is
 * inventory the tenant never put in their own system. Mapping all of it would be
 * a large amount of work for no benefit, so the review is narrowed to the
 * listings that have a candidate in the tenant's catalogue.
 */
export function filterToInventoryMatches(
  rows: readonly MappingRow[],
  options: { includeUnmatchable?: boolean } = {},
): readonly MappingRow[] {
  if (options.includeUnmatchable) return rows;
  return rows.filter((row) => row.state !== "unlinked" || row.candidates.length > 0);
}

/** The summary counts for the mapping screen. */
export type MappingSummary = Readonly<{
  total: number;
  linked: number;
  unlinked: number;
  rejected: number;
  /** Unmapped listings that have at least one candidate in the tenant's catalogue. */
  withSuggestions: number;
  /** Unmapped listings with no candidate in the tenant's catalogue. */
  withoutSuggestions: number;
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
  return {
    total: rows.length,
    linked,
    unlinked,
    rejected,
    withSuggestions,
    withoutSuggestions: unlinked - withSuggestions,
  };
}
