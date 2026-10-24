/**
 * Per-SKU unit status counts.
 *
 * The pricing filters need to know how many serialized units a SKU has and
 * how many of them are Sold or Available. This module holds the pure counting
 * logic so it can be tested without the server-only API client.
 */

export type SkuUnitStatusCounts = Readonly<{
  unitCount: number;
  soldCount: number;
  availableCount: number;
}>;

/** The shape of an inventory unit this module needs. */
export type UnitStatusInput = Readonly<{
  skuId: string;
  status: string | null;
}>;

const emptyCounts: SkuUnitStatusCounts = {
  unitCount: 0,
  soldCount: 0,
  availableCount: 0,
};

/**
 * Normalizes a source status for comparison. The source export uses
 * "Sold", "Available", and "Unavailable"; matching is case-insensitive and
 * ignores surrounding whitespace. Any other value counts toward the unit
 * total but not toward the Sold or Available counts.
 */
export function normalizeSourceStatus(status: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

/**
 * Counts units per SKU, split by source status.
 */
export function countSkuUnitStatuses(units: readonly UnitStatusInput[]): Map<string, SkuUnitStatusCounts> {
  const counts = new Map<string, SkuUnitStatusCounts>();

  for (const unit of units) {
    const current = counts.get(unit.skuId) ?? emptyCounts;
    const status = normalizeSourceStatus(unit.status);
    counts.set(unit.skuId, {
      unitCount: current.unitCount + 1,
      soldCount: current.soldCount + (status === "sold" ? 1 : 0),
      availableCount: current.availableCount + (status === "available" ? 1 : 0),
    });
  }

  return counts;
}
