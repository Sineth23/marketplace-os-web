"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listInventoryPricing, setInventoryPrice, type InventoryPricing } from "../../../lib/api";
import { session } from "../../../lib/auth";

export type PriceUpdate = Readonly<{
  skuId: string;
  price: number | null;
  isActive: boolean;
}>;

export async function updateInventoryPricesAction(data: { organizationId: string; updates: PriceUpdate[] }) {
  if (!(await session())) redirect("/");

  const { organizationId, updates } = data;

  for (const update of updates) {
    try {
      await setInventoryPrice(organizationId, update.skuId, update.price, update.isActive);
    } catch {
      return { error: "save_failed" as const };
    }
  }

  revalidatePath("/dashboard/pricing");
  return { saved: true as const };
}

export async function fetchPricingData(organizationId: string) {
  const pricing = await listInventoryPricing(organizationId).catch(() => [] as InventoryPricing[]);
  return pricing;
}
