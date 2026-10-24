/**
 * Parsers for the partner export files.
 *
 * Each screen in the partner application exports a different column set, so
 * every parser states the columns it requires, maps them onto the domain
 * types in ./partner-export-types.ts, and reports any column it did not read.
 * A column the parser does not recognize is never silently dropped: it is
 * listed in `unmappedColumns` so the operator can see that the export carried
 * more than the parser read.
 *
 * Header matching is case-insensitive and ignores punctuation, so "Purchase
 * Order", "purchase_order" and "PurchaseOrder" all resolve to the same column.
 */

import {
  csvColumns,
  parseCsvTable,
  presentValue,
  readAmount,
  readAnyPresent,
  readDate,
  readPresent,
  requireColumn,
  type CsvColumns,
} from "./csv.ts";
import type {
  ExportPreview,
  InventoryExportRow,
  OrganizationExportRow,
  PricingExportRow,
  ProcessBatchExportRow,
  ProductExportRow,
  PurchaseOrderExportRow,
  SalesOrderExportRow,
} from "./partner-export-types.ts";

const maximumRows = 50_000;

/** Columns the parser reads, so the remainder can be reported as unmapped. */
function unmapped(headers: readonly string[], read: readonly string[]): readonly string[] {
  const normalized = new Set(read.map((key) => key.replace(/[^a-z0-9]/g, "")));
  return headers.filter(
    (header) =>
      !normalized.has(
        header
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ""),
      ),
  );
}

/** Tenant-defined field columns, read from a prefix the export uses. */
const customFieldPrefixes = ["customfield", "field"];

/**
 * The partner's exports label the unit identifier column in more than one way.
 * These are column names in the partner's file format, not brand references,
 * so they are matched exactly as the partner writes them.
 */
const unitIdentifierColumns = ["id", "unitid", "inventoryid", "wholecellid"];

function readCustomFields(
  columns: CsvColumns,
  row: readonly string[],
  headers: readonly string[],
): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const header of headers) {
    const key = header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const isCustom = customFieldPrefixes.some((prefix) => key.startsWith(prefix));
    if (!isCustom) continue;
    const label =
      header
        .trim()
        .replace(/^custom[\s_-]?field[\s_-]*/i, "")
        .replace(/^[\s:_-]+/, "")
        .trim() || header.trim();
    const value = presentValue(columns.read(row, key));
    if (value !== undefined) values[label] = value;
  }
  return values;
}

/**
 * Parses an inventory export. The export is a flat projection of the units the
 * partner tracks, with product attributes, unit identifiers, order links,
 * prices, and tenant-defined field columns.
 */
export function parseInventoryExport(text: string): ExportPreview<InventoryExportRow> {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "id", "an ID");
  if (table.rows.length > maximumRows) {
    throw new Error(`A single export can contain up to ${maximumRows.toLocaleString("en-US")} rows.`);
  }

  const rows: InventoryExportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const unitId = readAnyPresent(columns, row, unitIdentifierColumns);
    if (!unitId) {
      rejected.push({ rowNumber, message: "The unit identifier is required." });
      return;
    }
    rows.push({
      rowNumber,
      unitId,
      serialNumber: readAnyPresent(columns, row, ["esn", "serialnumber", "serial", "imei", "hexid"]),
      manufacturer: readPresent(columns, row, "manufacturer"),
      model: readPresent(columns, row, "model"),
      variant: readPresent(columns, row, "variant"),
      network: readPresent(columns, row, "network"),
      capacity: readPresent(columns, row, "capacity"),
      color: readPresent(columns, row, "color"),
      grade: readPresent(columns, row, "grade"),
      damages: readAnyPresent(columns, row, ["damages", "damage", "damagecondition"]),
      status: readPresent(columns, row, "status"),
      location: readPresent(columns, row, "location"),
      purchaseOrder: readAnyPresent(columns, row, ["purchaseorder", "po", "ponumber"]),
      salesOrder: readAnyPresent(columns, row, ["salesorder", "so", "sonumber", "order"]),
      salePrice: readAmount(columns, row, "saleprice"),
      listPrice: readAmount(columns, row, "listprice"),
      customFields: readCustomFields(columns, row, table.headers),
    });
  });

  return {
    rows,
    rejected,
    unmappedColumns: unmapped(table.headers, [
      ...unitIdentifierColumns,
      "esn",
      "serialnumber",
      "serial",
      "imei",
      "hexid",
      "manufacturer",
      "model",
      "variant",
      "network",
      "capacity",
      "color",
      "grade",
      "damages",
      "damage",
      "damagecondition",
      "status",
      "location",
      "purchaseorder",
      "po",
      "ponumber",
      "salesorder",
      "so",
      "sonumber",
      "order",
      "saleprice",
      "listprice",
    ]),
    headers: table.headers,
  };
}

/**
 * Parses a process batch export. The export carries the units a batch acted
 * on, with the same product and status columns as an inventory export.
 */
export function parseProcessBatchExport(text: string): ExportPreview<ProcessBatchExportRow> {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "id", "an ID");
  if (table.rows.length > maximumRows) {
    throw new Error(`A single export can contain up to ${maximumRows.toLocaleString("en-US")} rows.`);
  }

  const rows: ProcessBatchExportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const unitId = readAnyPresent(columns, row, unitIdentifierColumns);
    if (!unitId) {
      rejected.push({ rowNumber, message: "The unit identifier is required." });
      return;
    }
    rows.push({
      rowNumber,
      unitId,
      serialNumber: readAnyPresent(columns, row, ["esn", "serialnumber", "serial", "imei", "hexid"]),
      manufacturer: readPresent(columns, row, "manufacturer"),
      model: readPresent(columns, row, "model"),
      variant: readPresent(columns, row, "variant"),
      network: readPresent(columns, row, "network"),
      capacity: readPresent(columns, row, "capacity"),
      color: readPresent(columns, row, "color"),
      grade: readPresent(columns, row, "grade"),
      damages: readAnyPresent(columns, row, ["damages", "damage", "damagecondition"]),
      status: readPresent(columns, row, "status"),
      location: readPresent(columns, row, "location"),
      purchaseOrder: readAnyPresent(columns, row, ["purchaseorder", "po", "ponumber"]),
      salesOrder: readAnyPresent(columns, row, ["salesorder", "so", "sonumber", "order"]),
      salePrice: readAmount(columns, row, "saleprice"),
      customFields: readCustomFields(columns, row, table.headers),
    });
  });

  return {
    rows,
    rejected,
    unmappedColumns: unmapped(table.headers, [
      ...unitIdentifierColumns,
      "esn",
      "serialnumber",
      "serial",
      "imei",
      "hexid",
      "manufacturer",
      "model",
      "variant",
      "network",
      "capacity",
      "color",
      "grade",
      "damages",
      "damage",
      "damagecondition",
      "status",
      "location",
      "purchaseorder",
      "po",
      "ponumber",
      "salesorder",
      "so",
      "sonumber",
      "order",
      "saleprice",
    ]),
    headers: table.headers,
  };
}

/** Parses a purchase order export. */
export function parsePurchaseOrderExport(text: string): ExportPreview<PurchaseOrderExportRow> {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "id", "an ID");
  if (table.rows.length > maximumRows) {
    throw new Error(`A single export can contain up to ${maximumRows.toLocaleString("en-US")} rows.`);
  }

  const rows: PurchaseOrderExportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sequentialId = readAnyPresent(columns, row, [
      "id",
      "sequentialid",
      "ponumber",
      "purchaseorder",
      "number",
    ]);
    if (!sequentialId) {
      rejected.push({ rowNumber, message: "The order identifier is required." });
      return;
    }
    rows.push({
      rowNumber,
      sequentialId,
      date: readDate(columns, row, "date") ?? readPresent(columns, row, "date"),
      channel: readPresent(columns, row, "channel"),
      organization: readAnyPresent(columns, row, ["vendor", "organization", "customer", "name"]),
      quantity: readAmount(columns, row, "quantity") ?? readAmount(columns, row, "devices"),
      transactionNumber: readAnyPresent(columns, row, ["transactionnumber", "transaction", "reference"]),
      status: readPresent(columns, row, "status"),
    });
  });

  return {
    rows,
    rejected,
    unmappedColumns: unmapped(table.headers, [
      "id",
      "sequentialid",
      "ponumber",
      "purchaseorder",
      "number",
      "date",
      "channel",
      "vendor",
      "organization",
      "customer",
      "name",
      "quantity",
      "devices",
      "transactionnumber",
      "transaction",
      "reference",
      "status",
    ]),
    headers: table.headers,
  };
}

/** Parses a pricing export. */
export function parsePricingExport(text: string): ExportPreview<PricingExportRow> {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "sku", "a SKU");
  if (table.rows.length > maximumRows) {
    throw new Error(`A single export can contain up to ${maximumRows.toLocaleString("en-US")} rows.`);
  }

  const rows: PricingExportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sku = readPresent(columns, row, "sku");
    if (!sku) {
      rejected.push({ rowNumber, message: "SKU is required." });
      return;
    }
    rows.push({
      rowNumber,
      sku,
      manufacturer: readPresent(columns, row, "manufacturer"),
      model: readPresent(columns, row, "model"),
      variant: readPresent(columns, row, "variant"),
      network: readPresent(columns, row, "network"),
      capacity: readPresent(columns, row, "capacity"),
      color: readPresent(columns, row, "color"),
      grade: readPresent(columns, row, "grade"),
      price: readAmount(columns, row, "price"),
      quantity: readAmount(columns, row, "quantity"),
      conditions: readAnyPresent(columns, row, ["conditions", "damages", "damagecondition"]),
    });
  });

  return {
    rows,
    rejected,
    unmappedColumns: unmapped(table.headers, [
      "sku",
      "manufacturer",
      "model",
      "variant",
      "network",
      "capacity",
      "color",
      "grade",
      "price",
      "quantity",
      "conditions",
      "damages",
      "damagecondition",
    ]),
    headers: table.headers,
  };
}

/** Parses a product catalog export. */
export function parseProductExport(text: string): ExportPreview<ProductExportRow> {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "sku", "a SKU");
  if (table.rows.length > maximumRows) {
    throw new Error(`A single export can contain up to ${maximumRows.toLocaleString("en-US")} rows.`);
  }

  const rows: ProductExportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sku = readPresent(columns, row, "sku");
    if (!sku) {
      rejected.push({ rowNumber, message: "SKU is required." });
      return;
    }
    rows.push({
      rowNumber,
      sku,
      productId: readAnyPresent(columns, row, ["id", "productid", "variationid"]),
      title: readAnyPresent(columns, row, ["product", "title", "name"]),
      grade: readPresent(columns, row, "grade"),
      conditions: readAnyPresent(columns, row, ["conditions", "condition", "damages"]),
    });
  });

  return {
    rows,
    rejected,
    unmappedColumns: unmapped(table.headers, [
      "sku",
      "id",
      "productid",
      "variationid",
      "product",
      "title",
      "name",
      "grade",
      "conditions",
      "condition",
      "damages",
    ]),
    headers: table.headers,
  };
}

/** Parses an organization export. */
export function parseOrganizationExport(text: string): ExportPreview<OrganizationExportRow> {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "name", "a Name");
  if (table.rows.length > maximumRows) {
    throw new Error(`A single export can contain up to ${maximumRows.toLocaleString("en-US")} rows.`);
  }

  const rows: OrganizationExportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const name = readPresent(columns, row, "name");
    if (!name) {
      rejected.push({ rowNumber, message: "Name is required." });
      return;
    }
    rows.push({
      rowNumber,
      name,
      createdAt: readDate(columns, row, "createdat") ?? readPresent(columns, row, "createdat"),
    });
  });

  return {
    rows,
    rejected,
    unmappedColumns: unmapped(table.headers, ["name", "createdat"]),
    headers: table.headers,
  };
}

/** Parses a sales order export. */
export function parseSalesOrderExport(text: string): ExportPreview<SalesOrderExportRow> {
  const table = parseCsvTable(text);
  const columns = csvColumns(table.headers);
  requireColumn(columns, "id", "an ID");
  if (table.rows.length > maximumRows) {
    throw new Error(`A single export can contain up to ${maximumRows.toLocaleString("en-US")} rows.`);
  }

  const rows: SalesOrderExportRow[] = [];
  const rejected: Array<Readonly<{ rowNumber: number; message: string }>> = [];
  table.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sequentialId = readAnyPresent(columns, row, [
      "id",
      "sequentialid",
      "sonumber",
      "salesorder",
      "ordernumber",
      "number",
    ]);
    if (!sequentialId) {
      rejected.push({ rowNumber, message: "The order identifier is required." });
      return;
    }
    rows.push({
      rowNumber,
      sequentialId,
      date: readDate(columns, row, "date") ?? readPresent(columns, row, "date"),
      channel: readPresent(columns, row, "channel"),
      customer: readAnyPresent(columns, row, ["customer", "organization", "vendor"]),
      status: readPresent(columns, row, "status"),
      quantity: readAmount(columns, row, "quantity") ?? readAmount(columns, row, "items"),
      amount: readAmount(columns, row, "amount") ?? readAmount(columns, row, "total"),
    });
  });

  return {
    rows,
    rejected,
    unmappedColumns: unmapped(table.headers, [
      "id",
      "sequentialid",
      "sonumber",
      "salesorder",
      "ordernumber",
      "number",
      "date",
      "channel",
      "customer",
      "organization",
      "vendor",
      "status",
      "quantity",
      "items",
      "amount",
      "total",
    ]),
    headers: table.headers,
  };
}
