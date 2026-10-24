import { listAllInventoryUnits } from "./api";
import { countSkuUnitStatuses, type SkuUnitStatusCounts } from "./pricing-unit-status";

/**
 * Loads every unit for the organization and reduces it to per-SKU counts.
 *
 * This runs on the server only. It reuses the existing paginated units
 * endpoint, so no backend change is required, and the full unit list never
 * reaches the browser.
 */
export async function loadSkuUnitStatusCounts(
  organizationId: string,
): Promise<Map<string, SkuUnitStatusCounts>> {
  const units = await listAllInventoryUnits(organizationId);
  return countSkuUnitStatuses(units);
}
