import type { InventoryImportRow } from "./api";

export type InventoryCsvPreview = Readonly<{
  rows: readonly InventoryImportRow[];
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
  headers: readonly string[];
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
    indexes[
      header
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    ] = index;
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

export function parseInventoryCsv(text: string): InventoryCsvPreview {
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
      damageNotes: readColumn(csvRow, indexes, "damagenotes"),
      sourceUnitId:
        readColumn(csvRow, indexes, "wholecellid") ??
        readColumn(csvRow, indexes, "internalid") ??
        readColumn(csvRow, indexes, "unitid"),
      serialNumber:
        readColumn(csvRow, indexes, "esn") ??
        readColumn(csvRow, indexes, "serialnumber") ??
        readColumn(csvRow, indexes, "serial") ??
        readColumn(csvRow, indexes, "hexid"),
      location: readColumn(csvRow, indexes, "location"),
      status: readColumn(csvRow, indexes, "status"),
    });
  });
  if (rows.length === 0) throw new Error("No importable SKU rows were found.");
  if (rows.length > 10_000) throw new Error("A single import can contain up to 10,000 SKU rows.");
  return { rows, rejected, headers };
}
