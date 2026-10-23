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
        // exported file still satisfies the importer's 17-column contract.
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
