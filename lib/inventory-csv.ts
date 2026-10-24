import type { InventoryImportRow } from "./api";
import { csvColumns, parseCsvTable, readAnyPresent, readPresent } from "./csv.ts";

export type InventoryCsvPreview = Readonly<{
  rows: readonly InventoryImportRow[];
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
  headers: readonly string[];
}>;

export function parseInventoryCsv(text: string): InventoryCsvPreview {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  if (columns.index("sku") === undefined) throw new Error("The CSV must include a SKU column.");

  const rows: InventoryImportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((csvRow, index) => {
    const rowNumber = index + 2;
    const sku = readPresent(columns, csvRow, "sku");
    if (!sku) {
      rejected.push({ rowNumber, message: "SKU is required." });
      return;
    }
    rows.push({
      rowNumber,
      sku,
      manufacturer: readPresent(columns, csvRow, "manufacturer"),
      model: readPresent(columns, csvRow, "model"),
      variant: readPresent(columns, csvRow, "variant"),
      network: readPresent(columns, csvRow, "network"),
      capacity: readPresent(columns, csvRow, "capacity"),
      color: readPresent(columns, csvRow, "color"),
      grade: readPresent(columns, csvRow, "grade"),
      damages: readAnyPresent(columns, csvRow, ["damages", "damage"]),
      damageNotes: readPresent(columns, csvRow, "damagenotes"),
      sourceUnitId: readAnyPresent(columns, csvRow, ["wholecellid", "id", "internalid", "unitid"]),
      serialNumber: readAnyPresent(columns, csvRow, ["esn", "serialnumber", "serial", "hexid"]),
      location: readPresent(columns, csvRow, "location"),
      status: readPresent(columns, csvRow, "status"),
    });
  });
  if (rows.length === 0) throw new Error("No importable SKU rows were found.");
  if (rows.length > 10_000) throw new Error("A single import can contain up to 10,000 SKU rows.");
  return { rows, rejected, headers: table.headers };
}
