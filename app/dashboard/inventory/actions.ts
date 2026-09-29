"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setInventoryUnitState, type InventoryUnit } from "../../../lib/api";

export async function changeInventoryUnitStateAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  const state = String(formData.get("state") ?? "unknown") as InventoryUnit["inventoryState"];
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    await setInventoryUnitState(organizationId, unitId, state, reason);
    revalidatePath("/dashboard/inventory");
  } catch {
    redirect("/dashboard/inventory?stateUpdate=failed");
  }
  redirect("/dashboard/inventory?stateUpdate=saved");
}
