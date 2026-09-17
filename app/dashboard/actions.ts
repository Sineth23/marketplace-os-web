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

function parseCsv(text: string): readonly string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted value.");
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function cell(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function columnIndexes(headers: readonly string[]): Readonly<Record<string, number | undefined>> {
  const indexes: Record<string, number | undefined> = {};
  headers.forEach((header, index) => {
    const key = header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    indexes[key] = index;
  });
  return indexes;
}

function readColumn(
  row: readonly string[],
  indexes: Readonly<Record<string, number | undefined>>,
  key: string,
): string | undefined {
  const index = indexes[key];
  return index === undefined ? undefined : cell(row[index]);
}

function parseInventoryCsv(text: string): Readonly<{
  rows: readonly InventoryImportRow[];
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
}> {
  const csvRows = parseCsv(text).filter((row) => row.some((value) => value.trim()));
  const headers = csvRows[0];
  if (!headers) throw new Error("The selected file is empty.");
  const indexes = columnIndexes(headers);
  if (indexes.sku === undefined) throw new Error("The CSV must include a SKU column.");

  const rows: InventoryImportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  csvRows.slice(1).forEach((csvRow, index) => {
    const rowNumber = index + 2;
    const sku = readColumn(csvRow, indexes, "sku");
    if (!sku) {
      rejected.push({ rowNumber, message: "SKU is required." });
      return;
    }
    rows.push({
      rowNumber,
      sku,
      manufacturer: readColumn(csvRow, indexes, "manufacturer"),
      model: readColumn(csvRow, indexes, "model"),
      variant: readColumn(csvRow, indexes, "variant"),
      network: readColumn(csvRow, indexes, "network"),
      capacity: readColumn(csvRow, indexes, "capacity"),
      color: readColumn(csvRow, indexes, "color"),
      grade: readColumn(csvRow, indexes, "grade"),
      damages: readColumn(csvRow, indexes, "damages") ?? readColumn(csvRow, indexes, "damage"),
    });
  });
  if (rows.length === 0) throw new Error("No importable SKU rows were found.");
  if (rows.length > 10_000) throw new Error("A single import can contain up to 10,000 SKU rows.");
  return { rows, rejected };
}

export async function importInventoryAction(
  _previousState: InventoryImportActionState,
  formData: FormData,
): Promise<InventoryImportActionState> {
  const organizationId = formData.get("organizationId");
  const file = formData.get("file");
  if (typeof organizationId !== "string" || !(file instanceof File) || file.size === 0) {
    return { message: "Choose a CSV file before importing.", error: true, consolidatedRows: 0, rejected: [] };
  }
  try {
    const parsed = parseInventoryCsv(await file.text());
    const result = await importInventory(organizationId, parsed.rows);
    revalidatePath("/dashboard");
    const consolidatedRows = result.rejected.filter((row) =>
      row.message.startsWith("A matching SKU appears earlier"),
    ).length;
    const rejected = [
      ...parsed.rejected,
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
