import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPricingFilters,
  emptyPricingFilters,
  hasActivePricingFilters,
  isFullySold,
  isPriceFilter,
  isInventoryFilter,
  paginatePricingRows,
  parseInventoryFilter,
  parsePriceFilter,
  pricingFilterQuery,
  PRICING_PAGE_SIZE,
} from "./pricing-filters.ts";
import { countSkuUnitStatuses } from "./pricing-unit-status.ts";

/**
 * Builds a dataset with the same shape as the pricing workspace:
 *
 * - 2,224 catalog SKUs in total.
 * - 176 SKUs carry a saved price.
 * - Of those priced SKUs, 4 are fully sold, leaving 172.
 * - 138 priced SKUs have at least one unit with source status "Available".
 */
function buildDataset() {
  const TOTAL_SKUS = 2224;
  const PRICED_SKUS = 176;
  const FULLY_SOLD_PRICED = 4;
  const AVAILABLE_PRICED = 138;

  const rows = [];
  const units = [];

  for (let index = 0; index < TOTAL_SKUS; index += 1) {
    const id = `sku-${index}`;
    const priced = index < PRICED_SKUS;
    const row = {
      id,
      sourceSku: `SKU${String(index).padStart(5, "0")}`,
      manufacturer: index % 2 === 0 ? "Apple" : "Samsung",
      model: index % 3 === 0 ? "iPhone 13" : "Galaxy S21",
      variant: "",
      network: "",
      capacity: "",
      color: "",
      grade: "C Grade",
      damages: "",
      quantity: 1,
      price: priced ? 100 + index : null,
      unitCount: 0,
      soldCount: 0,
      availableCount: 0,
    };
    rows.push(row);
  }

  // 138 priced SKUs have at least one "Available" unit.
  for (let index = 0; index < AVAILABLE_PRICED; index += 1) {
    units.push({ skuId: `sku-${index}`, status: "Available" });
  }

  // 4 more priced SKUs are fully sold: every one of their units is "Sold".
  // They have no "Available" unit, so they are excluded by the availability
  // filter, which is why 138 and 172 are different numbers.
  for (let index = AVAILABLE_PRICED; index < AVAILABLE_PRICED + FULLY_SOLD_PRICED; index += 1) {
    units.push({ skuId: `sku-${index}`, status: "Sold" });
  }

  // The remaining priced SKUs have units, but none of them are "Available".
  // 138 + 4 + 34 = 176 priced SKUs.
  for (let index = AVAILABLE_PRICED + FULLY_SOLD_PRICED; index < PRICED_SKUS; index += 1) {
    units.push({ skuId: `sku-${index}`, status: "Unavailable" });
  }

  // Unpriced SKUs also carry units, so the inventory filter alone is not a
  // proxy for the price filter.
  for (let index = PRICED_SKUS; index < TOTAL_SKUS; index += 1) {
    if (index % 10 === 0) units.push({ skuId: `sku-${index}`, status: "Available" });
  }

  const counts = countSkuUnitStatuses(
    units.map((unit, index) => ({
      id: `unit-${index}`,
      skuId: unit.skuId,
      sku: unit.skuId,
      serialNumber: null,
      grade: null,
      damageNotes: null,
      location: null,
      status: unit.status,
      inventoryState: "unknown",
    })),
  );

  for (const row of rows) {
    const count = counts.get(row.id);
    row.unitCount = count?.unitCount ?? 0;
    row.soldCount = count?.soldCount ?? 0;
    row.availableCount = count?.availableCount ?? 0;
  }

  return rows;
}

const dataset = buildDataset();

test("the dataset matches the expected workspace shape", () => {
  assert.equal(dataset.length, 2224);
  assert.equal(dataset.filter((row) => row.price !== null).length, 176);
});

test("priced only returns the 176 priced SKUs", () => {
  const result = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    price: "priced",
  });
  assert.equal(result.length, 176);
  assert.ok(result.every((row) => row.price !== null));
});

test("priced plus exclude fully sold returns 172 SKUs", () => {
  const result = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    price: "priced",
    inventory: "exclude_fully_sold",
  });
  assert.equal(result.length, 172);
  assert.ok(result.every((row) => !isFullySold(row)));
});

test("priced plus has an available unit returns 138 SKUs", () => {
  const result = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    price: "priced",
    inventory: "has_available",
  });
  assert.equal(result.length, 138);
  assert.ok(result.every((row) => row.availableCount > 0));
});

test("unpriced returns the 2,048 SKUs without a price", () => {
  const result = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    price: "unpriced",
  });
  assert.equal(result.length, 2048);
  assert.ok(result.every((row) => row.price === null));
});

test("fully sold returns the 4 priced SKUs whose units are all Sold", () => {
  const result = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    inventory: "fully_sold",
  });
  assert.equal(result.length, 4);
  assert.ok(result.every((row) => row.unitCount > 0 && row.soldCount === row.unitCount));
});

test("a SKU with no units is not fully sold", () => {
  const noUnits = {
    ...dataset[0],
    id: "empty",
    unitCount: 0,
    soldCount: 0,
    availableCount: 0,
  };
  assert.equal(isFullySold(noUnits), false);
});

test("a SKU with a mix of Sold and Unavailable is not fully sold", () => {
  const mixed = {
    ...dataset[0],
    id: "mixed",
    unitCount: 3,
    soldCount: 2,
    availableCount: 0,
  };
  assert.equal(isFullySold(mixed), false);
});

test("search matches SKU, manufacturer, and model", () => {
  const bySku = applyPricingFilters(dataset, { ...emptyPricingFilters, search: "SKU00042" });
  assert.equal(bySku.length, 1);
  assert.equal(bySku[0]?.sourceSku, "SKU00042");

  const byManufacturer = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    search: "Apple",
  });
  assert.equal(byManufacturer.length, 1112);

  const byModel = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    search: "iPhone 13",
  });
  assert.equal(byModel.length, 742);

  const noMatch = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    search: "nothing-matches-this",
  });
  assert.equal(noMatch.length, 0);
});

test("filters combine with AND semantics", () => {
  const result = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    search: "Apple",
    price: "priced",
    inventory: "exclude_fully_sold",
  });
  const expected = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    price: "priced",
    inventory: "exclude_fully_sold",
  }).filter((row) => row.manufacturer === "Apple");
  assert.equal(result.length, expected.length);
});

test("pagination shows 100 rows on page 1 and 72 on page 2", () => {
  const filtered = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    price: "priced",
    inventory: "exclude_fully_sold",
  });
  assert.equal(filtered.length, 172);

  const first = paginatePricingRows(filtered, 1);
  assert.equal(first.rows.length, 100);
  assert.equal(first.start, 1);
  assert.equal(first.end, 100);
  assert.equal(first.total, 172);
  assert.equal(first.pageCount, 2);

  const second = paginatePricingRows(filtered, 2);
  assert.equal(second.rows.length, 72);
  assert.equal(second.start, 101);
  assert.equal(second.end, 172);
  assert.equal(second.pageCount, 2);
});

test("pagination clamps a page number beyond the last page", () => {
  const filtered = applyPricingFilters(dataset, {
    ...emptyPricingFilters,
    price: "priced",
    inventory: "exclude_fully_sold",
  });
  const beyond = paginatePricingRows(filtered, 99);
  assert.equal(beyond.page, 2);
  assert.equal(beyond.rows.length, 72);
});

test("pagination clamps a page number below one", () => {
  const filtered = applyPricingFilters(dataset, { ...emptyPricingFilters, price: "priced" });
  const below = paginatePricingRows(filtered, 0);
  assert.equal(below.page, 1);
  assert.equal(below.rows.length, PRICING_PAGE_SIZE);
});

test("pagination of an empty result set is safe", () => {
  const empty = paginatePricingRows([], 1);
  assert.equal(empty.rows.length, 0);
  assert.equal(empty.total, 0);
  assert.equal(empty.start, 0);
  assert.equal(empty.end, 0);
  assert.equal(empty.pageCount, 1);
});

test("filter parsing falls back to the default for unknown values", () => {
  assert.equal(parsePriceFilter("priced"), "priced");
  assert.equal(parsePriceFilter("unpriced"), "unpriced");
  assert.equal(parsePriceFilter("nonsense"), "all");
  assert.equal(parsePriceFilter(undefined), "all");

  assert.equal(parseInventoryFilter("fully_sold"), "fully_sold");
  assert.equal(parseInventoryFilter("nonsense"), "all");
  assert.equal(parseInventoryFilter(undefined), "all");

  assert.equal(isPriceFilter("priced"), true);
  assert.equal(isPriceFilter("nope"), false);
  assert.equal(isInventoryFilter("has_available"), true);
  assert.equal(isInventoryFilter("nope"), false);
});

test("the filter query only carries the active filters", () => {
  assert.equal(pricingFilterQuery(emptyPricingFilters), "");
  assert.equal(pricingFilterQuery({ ...emptyPricingFilters, price: "priced" }), "price=priced");
  assert.equal(
    pricingFilterQuery({
      ...emptyPricingFilters,
      search: "Apple",
      price: "priced",
      inventory: "exclude_fully_sold",
    }),
    "search=Apple&price=priced&inventory=exclude_fully_sold",
  );
});

test("hasActivePricingFilters reports whether anything is narrowed", () => {
  assert.equal(hasActivePricingFilters(emptyPricingFilters), false);
  assert.equal(hasActivePricingFilters({ ...emptyPricingFilters, search: "  " }), false);
  assert.equal(hasActivePricingFilters({ ...emptyPricingFilters, price: "priced" }), true);
  assert.equal(hasActivePricingFilters({ ...emptyPricingFilters, inventory: "fully_sold" }), true);
});

test("unit status counts are case-insensitive and ignore blanks", () => {
  const counts = countSkuUnitStatuses([
    {
      id: "u1",
      skuId: "s1",
      sku: "s1",
      serialNumber: null,
      grade: null,
      damageNotes: null,
      location: null,
      status: "Sold",
      inventoryState: "unknown",
    },
    {
      id: "u2",
      skuId: "s1",
      sku: "s1",
      serialNumber: null,
      grade: null,
      damageNotes: null,
      location: null,
      status: " sold ",
      inventoryState: "unknown",
    },
    {
      id: "u3",
      skuId: "s1",
      sku: "s1",
      serialNumber: null,
      grade: null,
      damageNotes: null,
      location: null,
      status: "Available",
      inventoryState: "unknown",
    },
    {
      id: "u4",
      skuId: "s1",
      sku: "s1",
      serialNumber: null,
      grade: null,
      damageNotes: null,
      location: null,
      status: null,
      inventoryState: "unknown",
    },
    {
      id: "u5",
      skuId: "s2",
      sku: "s2",
      serialNumber: null,
      grade: null,
      damageNotes: null,
      location: null,
      status: "Reserved",
      inventoryState: "unknown",
    },
  ]);

  assert.deepEqual(counts.get("s1"), { unitCount: 4, soldCount: 2, availableCount: 1 });
  assert.deepEqual(counts.get("s2"), { unitCount: 1, soldCount: 0, availableCount: 0 });
});
