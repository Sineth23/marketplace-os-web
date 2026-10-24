"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setInventoryPricesBulk } from "../../../lib/api";
import { session } from "../../../lib/auth";

export async function updateInventoryPricesFromCsv(data: {
  organizationId: string;
  updates: Readonly<{ sourceSku: string; price: number | null; isActive: boolean }>[];
}) {
  if (!(await session())) redirect("/");

  const { organizationId, updates } = data;

  try {
    const result = await setInventoryPricesBulk(organizationId, updates);
    revalidatePath("/dashboard/pricing");
    return { saved: result.saved, errors: result.errors };
  } catch (error) {
    return {
      error: "save_failed" as const,
      detail: error instanceof Error ? error.message : "Unable to update inventory prices.",
    };
  }
}
