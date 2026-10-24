/**
 * Detects which partner export a CSV holds, so an operator can drop any
 * exported file into one import screen and have it routed to the right parser.
 *
 * Detection is by column set, not by file name, because the partner's export
 * names vary by screen and locale while the columns are stable.
 *
 * Each kind declares the columns that must be present, and the columns that
 * make it distinctive. A file matches when every required column is present
 * and it matches at most one kind. A file that matches several kinds is
 * reported as ambiguous rather than guessed.
 */

import { csvColumns, parseCsvTable, type CsvColumns } from "./csv.ts";
import {
  parseInventoryExport,
  parseOrganizationExport,
  parsePricingExport,
  parseProcessBatchExport,
  parseProductExport,
  parsePurchaseOrderExport,
  parseSalesOrderExport,
} from "./partner-export-csv.ts";
import type { ExportPreview } from "./partner-export-types.ts";

/** The export kinds this application can import. */
export const exportKinds = [
  "inventory",
  "processBatch",
  "purchaseOrder",
  "pricing",
  "productCatalog",
  "organization",
  "salesOrder",
] as const;

export type ExportKind = (typeof exportKinds)[number];

/** A detected export kind and the file that was read. */
export type ExportDetection = Readonly<{
  kind: ExportKind;
  /** The partner's label for the screen, for the operator's benefit. */
  label: string;
  /** The file name, for the operator's benefit. */
  fileName: string;
  /** The column names present in the file. */
  headers: readonly string[];
  /** Column names the parser for this kind does not read. */
  unmappedColumns: readonly string[];
  /** Rows the parser could not map. */
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
  /** The number of rows the parser read. */
  rowCount: number;
}>;

/** Why detection could not settle on one kind. */
export type DetectionFailure = Readonly<{
  message: string;
  /** The kinds the file could plausibly be, when it matched more than one. */
  candidates?: readonly ExportKind[];
}>;

type KindSpec = Readonly<{
  kind: ExportKind;
  label: string;
  /** Columns that must all be present. */
  required: readonly string[];
  /** Columns that, when present, rule this kind out. */
  excludes?: readonly string[];
}>;

/**
 * The distinguishing columns per kind.
 *
 * `required` is the minimum set for a match. `excludes` names columns that
 * belong to a different kind, so an inventory export that also carries a
 * price column is still an inventory export.
 *
 * The inventory and process batch exports share their unit columns, so they
 * are told apart by breadth: an inventory export carries the wider set of
 * unit columns (location, order links, prices), while a process batch export
 * carries only the product and status columns.
 */
const kindSpecs: readonly KindSpec[] = [
  {
    kind: "inventory",
    label: "Inventory",
    required: ["id", "esn", "grade", "damages", "status", "location"],
    excludes: ["quantity", "devices", "vendor", "price", "product", "conditions"],
  },
  {
    kind: "processBatch",
    label: "Process batch",
    required: ["id", "esn", "grade", "status"],
    excludes: ["quantity", "devices", "vendor", "price", "product", "conditions", "location"],
  },
  {
    kind: "purchaseOrder",
    label: "Purchase order",
    required: ["id", "date", "channel", "vendor", "devices"],
    excludes: ["esn", "grade"],
  },
  {
    kind: "salesOrder",
    label: "Sales order",
    required: ["id", "date", "channel", "customer"],
    excludes: ["esn", "grade", "vendor", "devices"],
  },
  {
    kind: "pricing",
    label: "Pricing",
    required: ["sku", "price"],
    excludes: ["id", "esn"],
  },
  {
    kind: "productCatalog",
    label: "Product catalog",
    required: ["sku", "product", "grade", "conditions"],
    excludes: ["price", "quantity"],
  },
  {
    kind: "organization",
    label: "Organization",
    required: ["name"],
    excludes: ["id", "esn", "grade", "manufacturer", "model"],
  },
];

function has(columns: CsvColumns, key: string): boolean {
  return columns.index(key) !== undefined;
}

function matches(spec: KindSpec, columns: CsvColumns): boolean {
  if (!spec.required.every((key) => has(columns, key))) return false;
  if (spec.excludes?.some((key) => has(columns, key))) return false;
  return true;
}

/**
 * Reports which export kind a CSV holds.
 *
 * Returns the kind when exactly one matches, and a failure when none match
 * or more than one does. A file that matches several kinds is never guessed
 * at, because importing it as the wrong kind would write the wrong data.
 */
export function detectExportKind(
  text: string,
  fileName: string,
): Readonly<{ detection: ExportDetection } | { failure: DetectionFailure }> {
  let columns: CsvColumns;
  try {
    const table = parseCsvTable(text);
    columns = csvColumns(table.headers);
  } catch (error) {
    return {
      failure: {
        message: error instanceof Error ? error.message : "Unable to read this CSV.",
      },
    };
  }

  const candidates = kindSpecs.filter((spec) => matches(spec, columns));

  if (candidates.length === 0) {
    return {
      failure: {
        message:
          "This file does not match any supported export. Expected one of: inventory, process batch, purchase order, sales order, pricing, product catalog, or organization.",
      },
    };
  }
  if (candidates.length > 1) {
    return {
      failure: {
        message: "This file matches more than one export type.",
        candidates: candidates.map((spec) => spec.kind),
      },
    };
  }

  const spec = candidates[0]!;
  const preview = parseForKind(spec.kind, text);
  return {
    detection: {
      kind: spec.kind,
      label: spec.label,
      fileName,
      headers: preview.headers,
      unmappedColumns: preview.unmappedColumns,
      rejected: preview.rejected,
      rowCount: preview.rows.length,
    },
  };
}

/** Runs the parser for a kind. */
export function parseForKind<Row>(kind: ExportKind, text: string): ExportPreview<Row> {
  switch (kind) {
    case "inventory":
      return parseInventoryExport(text) as ExportPreview<Row>;
    case "processBatch":
      return parseProcessBatchExport(text) as ExportPreview<Row>;
    case "purchaseOrder":
      return parsePurchaseOrderExport(text) as ExportPreview<Row>;
    case "salesOrder":
      return parseSalesOrderExport(text) as ExportPreview<Row>;
    case "pricing":
      return parsePricingExport(text) as ExportPreview<Row>;
    case "productCatalog":
      return parseProductExport(text) as ExportPreview<Row>;
    case "organization":
      return parseOrganizationExport(text) as ExportPreview<Row>;
  }
}
