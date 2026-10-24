import type { ScanInventoryItem, ScanReportPreview, ScanResultRow } from "./api";
import { csvColumns, parseCsvTable, readPresent, requireColumn } from "./csv.ts";

export function parseScanResultsCsv(text: string): readonly ScanResultRow[] {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "result", "Result");
  requireColumn(columns, "id", "ID");
  requireColumn(columns, "esn", "ESN");
  if (table.rows.length > 5000) throw new Error("A scan report can contain up to 5,000 rows.");
  return table.rows.map((row, index) => {
    const result = readPresent(columns, row, "result");
    if (result !== "Audited" && result !== "Not Expected" && result !== "Not Found") {
      throw new Error(`Scan result row ${index + 2} has an unsupported Result value.`);
    }
    return {
      rowNumber: index + 2,
      scan: readPresent(columns, row, "scan"),
      result,
      manufacturer: readPresent(columns, row, "manufacturer"),
      model: readPresent(columns, row, "model"),
      variant: readPresent(columns, row, "variant"),
      network: readPresent(columns, row, "network"),
      capacity: readPresent(columns, row, "capacity"),
      color: readPresent(columns, row, "color"),
      grade: readPresent(columns, row, "grade"),
      conditions: readPresent(columns, row, "conditions"),
      serialNumber: readPresent(columns, row, "esn"),
      sourceUnitId: readPresent(columns, row, "id"),
      status: readPresent(columns, row, "status"),
      location: readPresent(columns, row, "location"),
      scannedAt: readPresent(columns, row, "scannedat"),
      scannedBy: readPresent(columns, row, "scannedby"),
    };
  });
}

export function parseScanInventoryCsv(text: string): readonly ScanInventoryItem[] {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "device", "Device");
  requireColumn(columns, "id", "ID");
  if (table.rows.length > 5000) throw new Error("A scan report can contain up to 5,000 rows.");
  return table.rows.map((row, index) => {
    const device = readPresent(columns, row, "device");
    if (!device) throw new Error(`Inventory row ${index + 2} has no device description.`);
    return {
      rowNumber: index + 2,
      device,
      grade: readPresent(columns, row, "grade"),
      damages: readPresent(columns, row, "damages"),
      sourceUnitId: readPresent(columns, row, "id"),
      serialNumber: readPresent(columns, row, "esn"),
      status: readPresent(columns, row, "status"),
      location: readPresent(columns, row, "location"),
      scannedAt: readPresent(columns, row, "scannedat"),
      scannedBy: readPresent(columns, row, "scannedby"),
    };
  });
}

export type { ScanReportPreview };
