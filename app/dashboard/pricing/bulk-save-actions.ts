"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listInventoryPricing, setInventoryPricesBulk, type InventoryPricing } from "../../../lib/api";
import { session } from "../../../lib/auth";
import { PRICING_SAVE_BATCH_SIZE } from "../../../lib/pricing-filters";

export type BulkPriceUpdate = Readonly<{
  sourceSku: string;
  price: number | null;
  isActive: boolean;
}>;

export type BulkPriceSaveResult = Readonly<{
  saved: number;
  failed: number;
  errors: string[];
}>;

/**
 * Saves price updates through the bulk pricing endpoint.
 *
 * The request is split into batches so a large filtered result set does not
 * become one oversized request. The bulk endpoint matches on `sourceSku` and
 * resolves it to the catalog SKU itself.
 */
export async function saveInventoryPricesBulkAction(data: {
  organizationId: string;
  updates: readonly BulkPriceUpdate[];
}): Promise<BulkPriceSaveResult> {
  if (!(await session())) redirect("/");

  const { organizationId, updates } = data;
  if (updates.length === 0) return { saved: 0, failed: 0, errors: [] };

  let saved = 0;
  const errors: string[] = [];

  for (let index = 0; index < updates.length; index += PRICING_SAVE_BATCH_SIZE) {
    const batch = updates.slice(index, index + PRICING_SAVE_BATCH_SIZE);
    try {
      const result = await setInventoryPricesBulk(organizationId, batch);
      saved += result.saved;
      errors.push(...result.errors);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to update inventory prices.";
      errors.push(detail);
    }
  }

  if (saved > 0) revalidatePath("/dashboard/pricing");

  return { saved, failed: updates.length - saved, errors };
}

export async function fetchPricingData(organizationId: string) {
  const pricing = await listInventoryPricing(organizationId).catch(() => [] as InventoryPricing[]);
  return pricing;
}
