"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createInventorySku, createOrganization, importInventory } from "../../lib/api";
import type { InventoryImportRow } from "../../lib/api";

export async function createOrganizationAction(formData: FormData): Promise<void> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) redirect("/dashboard?error=organization-name");
  try {
    await createOrganization(name);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthenticated") redirect("/");
    redirect("/dashboard?error=create-organization");
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

type InventoryImportActionState = Readonly<{
  message: string;
  error: boolean;
  consolidatedRows: number;
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
}>;

export async function importInventoryAction(
  _previousState: InventoryImportActionState,
  formData: FormData,
): Promise<InventoryImportActionState> {
  const organizationId = formData.get("organizationId");
  const rowsValue = formData.get("rows");
  if (typeof organizationId !== "string" || typeof rowsValue !== "string" || !rowsValue) {
    return {
      message: "Review a CSV before approving the import.",
      error: true,
      consolidatedRows: 0,
      rejected: [],
    };
  }
  try {
    const rows = JSON.parse(rowsValue) as readonly InventoryImportRow[];
    const result = await importInventory(organizationId, rows);
    revalidatePath("/dashboard");
    const consolidatedRows = result.rejected.filter((row) =>
      row.message.startsWith("A matching SKU appears earlier"),
    ).length;
    const rejected = [
      ...result.rejected.filter((row) => !row.message.startsWith("A matching SKU appears earlier")),
    ];
    const changed = result.importedCount + result.updatedCount;
    return {
      message: `${changed} SKU${changed === 1 ? " was" : "s were"} saved (${result.importedCount} new, ${result.updatedCount} updated).`,
      error: false,
      consolidatedRows,
      rejected,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import this file.";
    return { message, error: true, consolidatedRows: 0, rejected: [] };
  }
}

export async function createInventorySkuAction(formData: FormData): Promise<void> {
  const organizationId = formData.get("organizationId");
  const sku = formData.get("sku");
  if (typeof organizationId !== "string" || typeof sku !== "string" || !sku.trim()) {
    redirect("/dashboard/inventory/new?error=sku-required");
  }
  try {
    await createInventorySku(organizationId, {
      sku,
      manufacturer: stringValue(formData.get("manufacturer")),
      model: stringValue(formData.get("model")),
      variant: stringValue(formData.get("variant")),
      network: stringValue(formData.get("network")),
      capacity: stringValue(formData.get("capacity")),
      color: stringValue(formData.get("color")),
      grade: stringValue(formData.get("grade")),
      damages: stringValue(formData.get("damages")),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthenticated") redirect("/");
    redirect("/dashboard/inventory/new?error=create-failed");
  }
  revalidatePath("/dashboard/inventory");
  redirect("/dashboard/inventory?created=1");
}

function stringValue(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}
