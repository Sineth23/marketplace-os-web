/**
 * Types for the partner export files that feed the tenant inventory views.
 *
 * Every screen in the partner application exports a different column set, so
 * each parser produces its own row type. The names here describe the domain
 * rather than the partner's naming, and the field order follows the export's
 * own column order so an operator reading a preview sees the export's shape.
 */

/** A single unit of serialized inventory within a partner inventory export. */
export type InventoryExportRow = Readonly<{
  rowNumber: number;
  /** The partner's internal unit identifier, for example `V0`. */
  unitId: string | undefined;
  /** The serial or ESN. Absent when the export says N/A. */
  serialNumber: string | undefined;
  manufacturer: string | undefined;
  model: string | undefined;
  variant: string | undefined;
  network: string | undefined;
  capacity: string | undefined;
  color: string | undefined;
  grade: string | undefined;
  damages: string | undefined;
  status: string | undefined;
  location: string | undefined;
  /** The purchase order the unit arrived on. */
  purchaseOrder: string | undefined;
  /** The sales order the unit was sold on. */
  salesOrder: string | undefined;
  /** The unit's sale price as a number. */
  salePrice: number | undefined;
  /** The unit's list price as a number. */
  listPrice: number | undefined;
  /** Tenant-defined field values, keyed by the export's own field label. */
  customFields: Readonly<Record<string, string>>;
}>;

/** A row in a process batch export. */
export type ProcessBatchExportRow = Readonly<{
  rowNumber: number;
  unitId: string | undefined;
  serialNumber: string | undefined;
  manufacturer: string | undefined;
  model: string | undefined;
  variant: string | undefined;
  network: string | undefined;
  capacity: string | undefined;
  color: string | undefined;
  grade: string | undefined;
  damages: string | undefined;
  status: string | undefined;
  location: string | undefined;
  purchaseOrder: string | undefined;
  salesOrder: string | undefined;
  salePrice: number | undefined;
  customFields: Readonly<Record<string, string>>;
}>;

/** A row in a purchase order export. */
export type PurchaseOrderExportRow = Readonly<{
  rowNumber: number;
  /** The display number, for example `PO #90`. */
  sequentialId: string | undefined;
  date: string | undefined;
  channel: string | undefined;
  /** The customer or vendor name. */
  organization: string | undefined;
  /** The number of devices on the order. */
  quantity: number | undefined;
  transactionNumber: string | undefined;
  status: string | undefined;
}>;

/** A row in a pricing export. */
export type PricingExportRow = Readonly<{
  rowNumber: number;
  sku: string | undefined;
  manufacturer: string | undefined;
  model: string | undefined;
  variant: string | undefined;
  network: string | undefined;
  capacity: string | undefined;
  color: string | undefined;
  grade: string | undefined;
  price: number | undefined;
  quantity: number | undefined;
  conditions: string | undefined;
}>;

/** A row in a product catalog export. */
export type ProductExportRow = Readonly<{
  rowNumber: number;
  /** The composed catalog identifier, for example `IPHONE17A3258256GBBLACOB`. */
  sku: string | undefined;
  productId: string | undefined;
  title: string | undefined;
  grade: string | undefined;
  conditions: string | undefined;
}>;

/** A row in an organization export. */
export type OrganizationExportRow = Readonly<{
  rowNumber: number;
  name: string | undefined;
  createdAt: string | undefined;
}>;

/** A row in a sales order export. */
export type SalesOrderExportRow = Readonly<{
  rowNumber: number;
  sequentialId: string | undefined;
  date: string | undefined;
  channel: string | undefined;
  customer: string | undefined;
  status: string | undefined;
  quantity: number | undefined;
  amount: number | undefined;
}>;

/** A parsed partner export: the rows plus the columns that were not mapped. */
export type ExportPreview<Row> = Readonly<{
  rows: readonly Row[];
  /** Rows the parser could not map, with the reason. */
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
  /** Column names in the file that the parser did not read. */
  unmappedColumns: readonly string[];
  headers: readonly string[];
}>;
