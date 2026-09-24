import type { ScanInventoryItem, ScanReportPreview, ScanResultRow } from "./api";

function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      records.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted value.");
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    records.push(row);
  }
  return records.filter((record) => record.some((cell) => cell.trim()));
}

function normalizedHeaders(headers: readonly string[]): Map<string, number> {
  return new Map(
    headers.map((header, index) => [
      header
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
      index,
    ]),
  );
}

function value(row: readonly string[], headers: Map<string, number>, key: string): string | undefined {
  const raw = row[headers.get(key) ?? -1]?.trim();
  return raw || undefined;
}

function serial(value: string | undefined): string | undefined {
  return value && !/^(?:n\/a|na)$/i.test(value.trim()) ? value.trim() : undefined;
}

export function parseScanResultsCsv(text: string): readonly ScanResultRow[] {
  const [headerRow, ...rows] = parseCsv(text);
  if (!headerRow) throw new Error("The scan-results CSV is empty.");
  const headers = normalizedHeaders(headerRow);
  for (const key of ["result", "id", "esn"])
    if (!headers.has(key)) throw new Error(`The scan-results CSV must include ${key.toUpperCase()}.`);
  if (rows.length > 5000) throw new Error("A scan report can contain up to 5,000 rows.");
  return rows.map((row, index) => {
    const result = value(row, headers, "result");
    if (result !== "Audited" && result !== "Not Expected" && result !== "Not Found") {
      throw new Error(`Scan result row ${index + 2} has an unsupported Result value.`);
    }
    return {
      rowNumber: index + 2,
      scan: value(row, headers, "scan"),
      result,
      manufacturer: value(row, headers, "manufacturer"),
      model: value(row, headers, "model"),
      variant: value(row, headers, "variant"),
      network: value(row, headers, "network"),
      capacity: value(row, headers, "capacity"),
      color: value(row, headers, "color"),
      grade: value(row, headers, "grade"),
      conditions: value(row, headers, "conditions"),
      serialNumber: serial(value(row, headers, "esn")),
      sourceUnitId: value(row, headers, "id"),
      status: value(row, headers, "status"),
      location: value(row, headers, "location"),
      scannedAt: value(row, headers, "scannedat"),
      scannedBy: value(row, headers, "scannedby"),
    };
  });
}

export function parseScanInventoryCsv(text: string): readonly ScanInventoryItem[] {
  const [headerRow, ...rows] = parseCsv(text);
  if (!headerRow) throw new Error("The inventory-items CSV is empty.");
  const headers = normalizedHeaders(headerRow);
  for (const key of ["device", "id"])
    if (!headers.has(key)) throw new Error(`The inventory-items CSV must include ${key.toUpperCase()}.`);
  if (rows.length > 5000) throw new Error("A scan report can contain up to 5,000 rows.");
  return rows.map((row, index) => {
    const device = value(row, headers, "device");
    if (!device) throw new Error(`Inventory row ${index + 2} has no device description.`);
    return {
      rowNumber: index + 2,
      device,
      grade: value(row, headers, "grade"),
      damages: value(row, headers, "damages"),
      sourceUnitId: value(row, headers, "id"),
      serialNumber: serial(value(row, headers, "esn")),
      status: value(row, headers, "status"),
      location: value(row, headers, "location"),
      scannedAt: value(row, headers, "scannedat"),
      scannedBy: value(row, headers, "scannedby"),
    };
  });
}

export type { ScanReportPreview };
