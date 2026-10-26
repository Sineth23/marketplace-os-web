"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveInventoryImport,
  approvePartnerExport,
  createInventoryPreview,
  createInventorySku,
  createOrganization,
  approveScanReport,
  createScanReportPreview,
  createPartnerExportPreview,
  saveProviderMapping,
} from "../../lib/api";
import type {
  InventoryImportBatch,
  InventoryImportRow,
  PartnerExportBatch,
  PartnerExportKind,
  PartnerExportRow,
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
    const created = batch.result?.unitsCreated ?? 0;
    const updated = batch.result?.unitsUpdated ?? 0;
    const renamed = batch.result?.skusRenamed ?? 0;
    const renamedText = renamed > 0 ? ` ${renamed} catalog SKU(s) renamed.` : "";
    return {
      message: `${created} serialized unit(s) added, ${updated} updated.${renamedText}`,
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

export type PartnerExportActionState = Readonly<{
  message: string;
  error: boolean;
  batch: PartnerExportBatch | null;
  sourceFileName?: string;
}>;

const partnerExportKinds: readonly PartnerExportKind[] = [
  "inventory",
  "processBatch",
  "purchaseOrder",
  "salesOrder",
  "pricing",
  "productCatalog",
  "organization",
];

export async function createPartnerExportPreviewAction(
  _previousState: PartnerExportActionState,
  formData: FormData,
): Promise<PartnerExportActionState> {
  const organizationId = formData.get("organizationId");
  const sourceFileName = formData.get("sourceFileName");
  const exportKind = formData.get("exportKind");
  const rowsValue = formData.get("rows");
  const rejectedValue = formData.get("rejected");
  if (
    typeof organizationId !== "string" ||
    typeof sourceFileName !== "string" ||
    typeof exportKind !== "string" ||
    typeof rowsValue !== "string" ||
    typeof rejectedValue !== "string" ||
    !rowsValue
  ) {
    return {
      message: "Review an exported file before approving the import.",
      error: true,
      batch: null,
      sourceFileName: "",
    };
  }
  if (!partnerExportKinds.includes(exportKind as PartnerExportKind)) {
    return {
      message: "That export type is not supported.",
      error: true,
      batch: null,
      sourceFileName,
    };
  }
  let batch: PartnerExportBatch;
  try {
    const rows = JSON.parse(rowsValue) as readonly PartnerExportRow[];
    const rejected = JSON.parse(rejectedValue) as readonly Readonly<{
      rowNumber: number;
      message: string;
    }>[];
    batch = await createPartnerExportPreview(
      organizationId,
      sourceFileName,
      exportKind as PartnerExportKind,
      rows,
      rejected,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import this file.";
    return { message, error: true, batch: null, sourceFileName };
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard?reviewExport=${encodeURIComponent(batch.id)}`);
}

export async function approvePartnerExportAction(
  _previousState: PartnerExportActionState,
  formData: FormData,
): Promise<PartnerExportActionState> {
  const organizationId = formData.get("organizationId");
  const batchId = formData.get("batchId");
  if (typeof organizationId !== "string" || typeof batchId !== "string") {
    return { message: "Create a server preview before approving it.", error: true, batch: null };
  }
  try {
    const batch = await approvePartnerExport(organizationId, batchId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/pricing");
    revalidatePath("/dashboard/product-catalog");
    const imported = batch.result?.importedCount ?? 0;
    const skipped = batch.result?.skippedCount ?? 0;
    return {
      message: `${imported} row(s) imported${skipped ? `, ${skipped} skipped` : ""}.`,
      error: false,
      batch,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve this batch.";
    return { message, error: true, batch: null };
  }
}

export type ProviderMappingActionState = Readonly<{
  message: string;
  error: boolean;
}>;

/**
 * Saves a reviewed mapping between a provider's sku and a catalog sku.
 *
 * A rejected mapping carries no catalog sku. It records that the listing was
 * reviewed and deliberately left unmapped, so it is not offered again on every
 * read.
 */
export async function saveProviderMappingAction(
  _previousState: ProviderMappingActionState,
  formData: FormData,
): Promise<ProviderMappingActionState> {
  const organizationId = formData.get("organizationId");
  const provider = formData.get("provider");
  const providerSku = formData.get("providerSku");
  const inventorySkuId = formData.get("inventorySkuId");
  const state = formData.get("state");
  if (
    typeof organizationId !== "string" ||
    typeof provider !== "string" ||
    typeof providerSku !== "string" ||
    !providerSku.trim()
  ) {
    return { message: "The listing to map is missing.", error: true };
  }
  const wantsLink = state === "linked";
  if (wantsLink && (typeof inventorySkuId !== "string" || !inventorySkuId)) {
    return { message: "Choose a catalog sku, or mark the listing as not in the catalogue.", error: true };
  }
  try {
    await saveProviderMapping(organizationId, {
      provider,
      providerSku,
      state: wantsLink ? "linked" : "rejected",
      ...(wantsLink ? { inventorySkuId: inventorySkuId as string } : {}),
    });
    revalidatePath("/dashboard/listings");
    revalidatePath("/dashboard/listing-mappings");
    return {
      message: wantsLink ? "Mapping saved." : "Listing marked as not in the catalogue.",
      error: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save this mapping.";
    return { message, error: true };
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
