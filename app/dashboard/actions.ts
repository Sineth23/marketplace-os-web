"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveInventoryImport,
  createInventoryPreview,
  createInventorySku,
  createOrganization,
  approveScanReport,
  createScanReportPreview,
} from "../../lib/api";
import type {
  InventoryImportBatch,
  InventoryImportRow,
  ScanReportBatch,
  ScanReportPreview,
} from "../../lib/api";

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

export type InventoryImportActionState = Readonly<{
  message: string;
  error: boolean;
  batch: InventoryImportBatch | null;
  sourceFileName?: string;
}>;

export async function createInventoryPreviewAction(
  _previousState: InventoryImportActionState,
  formData: FormData,
): Promise<InventoryImportActionState> {
  const organizationId = formData.get("organizationId");
  const sourceFileName = formData.get("sourceFileName");
  const rowsValue = formData.get("rows");
  const rejectedValue = formData.get("rejected");
  if (
    typeof organizationId !== "string" ||
    typeof sourceFileName !== "string" ||
    typeof rowsValue !== "string" ||
    typeof rejectedValue !== "string" ||
    !rowsValue
  ) {
    return {
      message: "Review a CSV before approving the import.",
      error: true,
      batch: null,
      sourceFileName: "",
    };
  }
  let batch: InventoryImportBatch;
  try {
    const rows = JSON.parse(rowsValue) as readonly InventoryImportRow[];
    const rejected = JSON.parse(rejectedValue) as readonly Readonly<{ rowNumber: number; message: string }>[];
    batch = await createInventoryPreview(organizationId, sourceFileName, rows, rejected);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import this file.";
    return { message, error: true, batch: null, sourceFileName };
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard?reviewBatch=${encodeURIComponent(batch.id)}`);
}

export async function approveInventoryImportAction(
  _previousState: InventoryImportActionState,
  formData: FormData,
): Promise<InventoryImportActionState> {
  const organizationId = formData.get("organizationId");
  const batchId = formData.get("batchId");
  if (typeof organizationId !== "string" || typeof batchId !== "string") {
    return { message: "Create a server preview before approving it.", error: true, batch: null };
  }
  try {
    const batch = await approveInventoryImport(organizationId, batchId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inventory");
    return {
      message: `${batch.result?.unitsCreated ?? 0} serialized units were added from this approved batch.`,
      error: false,
      batch,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve this batch.";
    return { message, error: true, batch: null };
  }
}

export type ScanReportActionState = Readonly<{
  message: string;
  error: boolean;
  batch: ScanReportBatch | null;
}>;

export async function createScanReportPreviewAction(
  _previousState: ScanReportActionState,
  formData: FormData,
): Promise<ScanReportActionState> {
  const organizationId = formData.get("organizationId");
  const previewValue = formData.get("preview");
  if (typeof organizationId !== "string" || typeof previewValue !== "string" || !previewValue) {
    return {
      message: "Choose both WholeCell CSV files before creating a preview.",
      error: true,
      batch: null,
    };
  }
  let batch: ScanReportBatch;
  try {
    const preview = JSON.parse(previewValue) as ScanReportPreview;
    batch = await createScanReportPreview(organizationId, preview);
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to create a scan report preview.",
      error: true,
      batch: null,
    };
  }
  revalidatePath("/dashboard/scan-reports");
  redirect(`/dashboard/scan-reports?reviewBatch=${encodeURIComponent(batch.id)}`);
}

export async function approveScanReportAction(
  _previousState: ScanReportActionState,
  formData: FormData,
): Promise<ScanReportActionState> {
  const organizationId = formData.get("organizationId");
  const batchId = formData.get("batchId");
  if (typeof organizationId !== "string" || typeof batchId !== "string") {
    return { message: "Create a server preview before approving this report.", error: true, batch: null };
  }
  try {
    const batch = await approveScanReport(organizationId, batchId);
    revalidatePath("/dashboard/scan-reports");
    return { message: "Scan report approved and saved. Inventory was not changed.", error: false, batch };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to approve this scan report.",
      error: true,
      batch: null,
    };
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
