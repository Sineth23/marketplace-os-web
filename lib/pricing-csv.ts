export const PRICING_CSV_INPUT_ID = "pricing-csv-input";

/**
 * Column order matches the spreadsheet accepted by `PricingUpload`
 * (`components/pricing-upload.tsx`): SKU at index 0, Price at index 16.
 * Keep the two in sync so an export can be edited and re-uploaded.
 */
export const PRICING_CSV_HEADERS = [
  "SKU",
  "Manufacturer",
  "Model",
  "Variant",
  "Network",
  "Capacity",
  "Color",
  "Grade",
  "Damages",
  "ID",
  "ESN",
  "Location",
  "Status",
  "Battery Health",
  "Marketplace Status",
  "Local",
  "Price",
] as const;

export type PricingCsvRow = Readonly<{
  sourceSku: string;
  manufacturer?: string | undefined;
  model?: string | undefined;
  variant?: string | undefined;
  network?: string | undefined;
  capacity?: string | undefined;
  color?: string | undefined;
  grade?: string | undefined;
  damages?: string | undefined;
  skuId?: string | undefined;
  price?: number | null | undefined;
}>;

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializePricingCsv(rows: readonly PricingCsvRow[]): string {
  const lines: string[] = [PRICING_CSV_HEADERS.join(",")];

  for (const row of rows) {
    lines.push(
      [
        cell(row.sourceSku),
        cell(row.manufacturer),
        cell(row.model),
        cell(row.variant),
        cell(row.network),
        cell(row.capacity),
        cell(row.color),
        cell(row.grade),
        cell(row.damages),
        cell(row.skuId),
        // Columns the pricing screen does not track, kept blank so the
        // exported file still matches the column order this app writes.
        cell(undefined),
        cell(undefined),
        cell(undefined),
        cell(undefined),
        cell(undefined),
        cell(undefined),
        cell(row.price),
      ].join(","),
    );
  }

  return `${lines.join("\r\n")}\r\n`;
}

export type PricingCsvUpdate = Readonly<{
  sourceSku: string;
  price: number | null;
  isActive: boolean;
}>;

export type PricingCsvImport = Readonly<{
  updates: PricingCsvUpdate[];
  errors: string[];
}>;

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

/**
 * Splits CSV text into rows, supporting quoted fields, escaped quotes, CRLF,
 * and newlines inside quoted values. Skips completely empty rows.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((parsedRow) => parsedRow.some((value) => value.trim() !== ""));
}

/**
 * Parses an uploaded pricing CSV.
 *
 * Supports:
 * - this app's 17-column export (`SKU` first, `Price` last)
 * - inventory exports that start with an `ID` column (`SKU` second, `Price` last)
 * - any file with a header row containing `SKU` and `Price` columns, regardless
 *   of column order (column names are matched case-insensitively)
 */
export function parsePricingCsv(text: string): PricingCsvImport {
  const rows = parseCsvRows(text);
  const errors: string[] = [];

  if (rows.length === 0) {
    return { updates: [], errors: ["The file is empty."] };
  }

  const firstRow = rows[0] ?? [];
  const header = firstRow.map(normalizeHeader);
  const headerSkuIndex = header.indexOf("sku");
  const headerPriceIndex = header.findIndex((name) => name === "price" || name.endsWith(" price"));
  const hasHeader = headerSkuIndex !== -1;

  let dataRows = rows;
  let skuIndex = 0;
  let priceIndex = 16;

  if (hasHeader) {
    if (headerPriceIndex === -1) {
      return {
        updates: [],
        errors: ["Could not find a Price column. Add a Price header with the sales price for each SKU."],
      };
    }
    dataRows = rows.slice(1);
    skuIndex = headerSkuIndex;
    priceIndex = headerPriceIndex;
  } else if (firstRow.length >= 17) {
    // Headerless file in the same order as this app's export.
    skuIndex = 0;
    priceIndex = 16;
  } else if (firstRow.length >= 2 && /^\d+$/.test((firstRow[0] ?? "").trim())) {
    // Inventory-style export without a header: ID, SKU, ... , Price.
    skuIndex = 1;
    priceIndex = firstRow.length - 1;
  } else {
    skuIndex = 0;
    priceIndex = firstRow.length - 1;
  }

  const updates: PricingCsvUpdate[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index] ?? [];
    const rowNumber = index + (hasHeader ? 2 : 1);

    if (row.every((value) => value.trim() === "")) continue;

    if (row.length <= Math.max(skuIndex, priceIndex)) {
      errors.push(`Row ${rowNumber}: not enough columns (found ${row.length}).`);
      continue;
    }

    const sourceSku = (row[skuIndex] ?? "").trim();
    if (!sourceSku) {
      errors.push(`Row ${rowNumber}: missing SKU.`);
      continue;
    }

    const rawPrice = (row[priceIndex] ?? "").trim();
    let price: number | null = null;

    if (rawPrice !== "") {
      const numericPrice = Number(rawPrice.replace(/[$,\s]/g, ""));
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        errors.push(`SKU ${sourceSku}: invalid price "${rawPrice}".`);
        continue;
      }
      price = numericPrice;
    }

    updates.push({ sourceSku, price, isActive: true });
  }

  if (updates.length === 0 && errors.length === 0) {
    errors.push("No rows with a SKU were found.");
  }

  return { updates, errors };
}
