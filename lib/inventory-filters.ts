export type InventorySkuInfo = Readonly<{
  id: string;
  sourceSku: string;
  manufacturer: string | null;
  model: string | null;
  variant: string | null;
  network: string | null;
  capacity: string | null;
  color: string | null;
  grade: string | null;
  damages: string | null;
}>;

export type InventoryUnitInfo = Readonly<{
  id: string;
  skuId: string;
  sku: string;
  serialNumber: string | null;
  grade: string | null;
  damageNotes: string | null;
  location: string | null;
  status: string | null;
  inventoryState: "available" | "reserved" | "sold" | "unavailable" | "unknown";
}>;

/** A serialized device joined with its catalog SKU, ready for the inventory table. */
export type InventoryRow = Readonly<{
  id: string;
  skuId: string;
  sourceSku: string;
  serialNumber: string | null;
  grade: string | null;
  damageNotes: string | null;
  location: string | null;
  status: string | null;
  inventoryState: InventoryUnitInfo["inventoryState"];
  manufacturer: string | null;
  model: string | null;
  variant: string | null;
  network: string | null;
  capacity: string | null;
  color: string | null;
  skuGrade: string | null;
  damages: string | null;
}>;

export type FunctionalityFilter = "any" | "functional" | "damaged";

export type InventoryFilters = Readonly<{
  manufacturer: string;
  model: string;
  variant: string;
  network: string;
  capacity: string;
  color: string;
  functionality: FunctionalityFilter;
  grade: string;
  status: string;
  location: string;
  esn: string;
}>;

export const emptyInventoryFilters: InventoryFilters = {
  manufacturer: "",
  model: "",
  variant: "",
  network: "",
  capacity: "",
  color: "",
  functionality: "any",
  grade: "",
  status: "",
  location: "",
  esn: "",
};

/** Product attribute selects, in the order they appear in the filter panel. */
export const productFilterKeys = [
  "manufacturer",
  "model",
  "variant",
  "network",
  "capacity",
  "color",
] as const;

export type ProductFilterKey = (typeof productFilterKeys)[number];

export function mergeInventoryRows(
  units: readonly InventoryUnitInfo[],
  skus: readonly InventorySkuInfo[],
): InventoryRow[] {
  const skuById = new Map<string, InventorySkuInfo>();
  for (const sku of skus) {
    skuById.set(sku.id, sku);
  }
  return units.map((unit) => {
    const sku = skuById.get(unit.skuId);
    return {
      id: unit.id,
      skuId: unit.skuId,
      sourceSku: sku?.sourceSku ?? unit.sku,
      serialNumber: unit.serialNumber,
      grade: unit.grade,
      damageNotes: unit.damageNotes,
      location: unit.location,
      status: unit.status,
      inventoryState: unit.inventoryState,
      manufacturer: sku?.manufacturer ?? null,
      model: sku?.model ?? null,
      variant: sku?.variant ?? null,
      network: sku?.network ?? null,
      capacity: sku?.capacity ?? null,
      color: sku?.color ?? null,
      skuGrade: sku?.grade ?? null,
      damages: sku?.damages ?? null,
    };
  });
}

function trimmed(value: string | null): string {
  return (value ?? "").trim();
}

/** The damage notes recorded on the unit take precedence over the catalog SKU damage. */
export function rowDamages(row: InventoryRow): string {
  return trimmed(row.damageNotes) || trimmed(row.damages);
}

/** The grade recorded on the unit takes precedence over the catalog SKU grade. */
export function rowGrade(row: InventoryRow): string {
  return trimmed(row.grade) || trimmed(row.skuGrade);
}

export function rowIsDamaged(row: InventoryRow): boolean {
  return rowDamages(row).length > 0;
}

export function uniqueValues(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.map((value) => trimmed(value ?? "")).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
}

/**
 * Options for one product select, narrowed by the other product selects that come
 * before it. Selecting "Apple" therefore only offers Apple models.
 */
export function cascadingOptions(
  rows: readonly InventoryRow[],
  key: ProductFilterKey,
  filters: Readonly<Record<ProductFilterKey, string>>,
): string[] {
  const earlierKeys = productFilterKeys.slice(0, productFilterKeys.indexOf(key));
  const narrowed = rows.filter((row) =>
    earlierKeys.every((earlierKey) => {
      const selected = filters[earlierKey];
      return !selected || trimmed(row[earlierKey]) === selected;
    }),
  );
  return uniqueValues(narrowed.map((row) => row[key]));
}

/** Grade and status options, narrowed by the product filters currently applied. */
export function dependentOptions(
  rows: readonly InventoryRow[],
  key: "grade" | "status" | "location",
  filters: InventoryFilters,
): string[] {
  const narrowed = rows.filter((row) =>
    productFilterKeys.every((productKey) => {
      const selected = filters[productKey];
      return !selected || trimmed(row[productKey]) === selected;
    }),
  );
  if (key === "grade") return uniqueValues(narrowed.map((row) => rowGrade(row)));
  if (key === "status") return uniqueValues(narrowed.map((row) => trimmed(row.status)));
  return uniqueValues(narrowed.map((row) => trimmed(row.location)));
}

/** Splits the ESN box into one identifier per line, ignoring blanks. */
export function parseEsnList(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Applies every filter to the rows and returns the rows that match all of them. */
export function applyInventoryFilters(
  rows: readonly InventoryRow[],
  filters: InventoryFilters,
  esnList: readonly string[],
  search: string,
): InventoryRow[] {
  const normalizedSearch = search.trim().toLowerCase();
  const esnNeedles = esnList.map((entry) => entry.toLowerCase());

  return rows.filter((row) => {
    if (filters.manufacturer && trimmed(row.manufacturer) !== filters.manufacturer) return false;
    if (filters.model && trimmed(row.model) !== filters.model) return false;
    if (filters.variant && trimmed(row.variant) !== filters.variant) return false;
    if (filters.network && trimmed(row.network) !== filters.network) return false;
    if (filters.capacity && trimmed(row.capacity) !== filters.capacity) return false;
    if (filters.color && trimmed(row.color) !== filters.color) return false;
    if (filters.grade && rowGrade(row) !== filters.grade) return false;
    if (filters.status && trimmed(row.status) !== filters.status) return false;
    if (filters.location && trimmed(row.location) !== filters.location) return false;

    if (filters.functionality === "functional" && rowIsDamaged(row)) return false;
    if (filters.functionality === "damaged" && !rowIsDamaged(row)) return false;

    if (
      esnNeedles.length > 0 &&
      !esnNeedles.some((needle) => trimmed(row.serialNumber).toLowerCase().includes(needle))
    ) {
      return false;
    }

    if (normalizedSearch) {
      const searchable = [
        row.sourceSku,
        row.serialNumber,
        row.manufacturer,
        row.model,
        row.variant,
        row.network,
        row.capacity,
        row.color,
        rowGrade(row),
        trimmed(row.status),
        trimmed(row.location),
        rowDamages(row),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(normalizedSearch)) return false;
    }

    return true;
  });
}

/** "Apple iPhone 13" style product title for the table cell. */
export function productTitle(row: InventoryRow): string {
  return [trimmed(row.manufacturer), trimmed(row.model)].filter(Boolean).join(" ") || "—";
}

/** "Wi-Fi | 128GB | Midnight | A2482" style detail line for the table cell. */
export function productDetails(row: InventoryRow): string {
  const details = [
    trimmed(row.network),
    trimmed(row.capacity),
    trimmed(row.color),
    trimmed(row.variant),
  ].filter(Boolean);
  return details.length > 0 ? details.join(" | ") : "—";
}
