import assert from "node:assert/strict";
import test from "node:test";

import {
  applyInventoryFilters,
  cascadingOptions,
  dependentOptions,
  emptyInventoryFilters,
  mergeInventoryRows,
  parseEsnList,
  productDetails,
  productTitle,
  rowDamages,
  rowGrade,
  uniqueValues,
} from "./inventory-filters.ts";

const skus = [
  {
    id: "sku-apple",
    sourceSku: "IPHONE13A2482128MIDNC",
    manufacturer: "Apple",
    model: "iPhone 13",
    variant: "A2482",
    network: "Wi-Fi",
    capacity: "128GB",
    color: "Midnight",
    grade: "B Grade",
    damages: null,
  },
  {
    id: "sku-samsung",
    sourceSku: "S21A2482128BLK",
    manufacturer: "Samsung",
    model: "Galaxy S21",
    variant: "A2482",
    network: "5G",
    capacity: "128GB",
    color: "Black",
    grade: "C Grade",
    damages: "Cracked back",
  },
  {
    id: "sku-apple-damaged",
    sourceSku: "IPHONE11A211164GBBLK",
    manufacturer: "Apple",
    model: "iPhone 11",
    variant: "A2111",
    network: "Unlocked",
    capacity: "64GB",
    color: "Black",
    grade: "C Grade",
    damages: null,
  },
];

const units = [
  {
    id: "unit-1",
    skuId: "sku-apple",
    sku: "IPHONE13A2482128MIDNC",
    serialNumber: "DX3H8N6BN7J",
    grade: "C Grade",
    damageNotes: null,
    location: "Scarborough",
    status: "Sold",
    inventoryState: "sold",
  },
  {
    id: "unit-2",
    skuId: "sku-samsung",
    sku: "S21A2482128BLK",
    serialNumber: "YJN32X4T79",
    grade: null,
    damageNotes: null,
    location: "Scarborough",
    status: "Unavailable",
    inventoryState: "unavailable",
  },
  {
    id: "unit-3",
    skuId: "sku-apple-damaged",
    sku: "IPHONE11A211164GBBLK",
    serialNumber: "MD9NJ71FJ9",
    grade: "C Grade",
    damageNotes: "Screen scratches",
    location: "Vaughan",
    status: "Available",
    inventoryState: "available",
  },
];

const rows = mergeInventoryRows(units, skus);

test("mergeInventoryRows joins units with their catalog SKU", () => {
  assert.equal(rows.length, 3);
  assert.equal(rows[0].sourceSku, "IPHONE13A2482128MIDNC");
  assert.equal(rows[0].model, "iPhone 13");
  assert.equal(rows[2].manufacturer, "Apple");
});

test("mergeInventoryRows falls back to the unit SKU when the catalog SKU is missing", () => {
  const orphan = mergeInventoryRows([{ ...units[0], skuId: "missing", sku: "ORPHAN-SKU" }], skus);
  assert.equal(orphan[0].sourceSku, "ORPHAN-SKU");
  assert.equal(orphan[0].model, null);
});

test("rowGrade prefers the unit grade over the catalog SKU grade", () => {
  assert.equal(rowGrade(rows[0]), "C Grade");
  assert.equal(rowGrade(rows[1]), "C Grade");
});

test("rowDamages reports damage notes and catalog damages", () => {
  assert.equal(rowDamages(rows[0]), "");
  assert.equal(rowDamages(rows[1]), "Cracked back");
  assert.equal(rowDamages(rows[2]), "Screen scratches");
});

test("productTitle and productDetails build the table cell lines", () => {
  assert.equal(productTitle(rows[0]), "Apple iPhone 13");
  assert.equal(productDetails(rows[0]), "Wi-Fi | 128GB | Midnight | A2482");
  assert.equal(productDetails(rows[1]), "5G | 128GB | Black | A2482");
});

test("parseEsnList splits on newlines, commas, and spaces", () => {
  assert.deepEqual(parseEsnList("ESN1\nESN2"), ["ESN1", "ESN2"]);
  assert.deepEqual(parseEsnList("ESN1, ESN2;ESN3"), ["ESN1", "ESN2", "ESN3"]);
  assert.deepEqual(parseEsnList("  \n "), []);
});

test("cascadingOptions narrows model options by the selected manufacturer", () => {
  const appleOnly = { ...emptyInventoryFilters, manufacturer: "Apple" };
  assert.deepEqual(cascadingOptions(rows, "model", appleOnly), ["iPhone 11", "iPhone 13"]);
  assert.deepEqual(cascadingOptions(rows, "model", emptyInventoryFilters), [
    "Galaxy S21",
    "iPhone 11",
    "iPhone 13",
  ]);
});

test("cascadingOptions narrows later options by earlier selections", () => {
  const filters = { ...emptyInventoryFilters, manufacturer: "Apple", model: "iPhone 13" };
  assert.deepEqual(cascadingOptions(rows, "network", filters), ["Wi-Fi"]);
  assert.deepEqual(cascadingOptions(rows, "color", filters), ["Midnight"]);
});

test("dependentOptions narrows grade, status, and location by product filters", () => {
  const appleOnly = { ...emptyInventoryFilters, manufacturer: "Apple" };
  // Both Apple units carry a unit-level "C Grade", which wins over the SKU grade.
  assert.deepEqual(dependentOptions(rows, "grade", appleOnly), ["C Grade"]);
  // The "Unavailable" status belongs to the Samsung unit, so it drops out here.
  assert.deepEqual(dependentOptions(rows, "status", appleOnly), ["Available", "Sold"]);
  assert.deepEqual(dependentOptions(rows, "location", appleOnly), ["Scarborough", "Vaughan"]);
  assert.deepEqual(dependentOptions(rows, "status", emptyInventoryFilters), [
    "Available",
    "Sold",
    "Unavailable",
  ]);
});

test("product filters combine with AND semantics", () => {
  const filters = { ...emptyInventoryFilters, manufacturer: "Apple", model: "iPhone 13" };
  const result = applyInventoryFilters(rows, filters, [], "");
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "unit-1");
});

test("functionality filter separates functional from damaged units", () => {
  const damaged = applyInventoryFilters(rows, { ...emptyInventoryFilters, functionality: "damaged" }, [], "");
  assert.deepEqual(
    damaged.map((row) => row.id),
    ["unit-2", "unit-3"],
  );

  const functional = applyInventoryFilters(
    rows,
    { ...emptyInventoryFilters, functionality: "functional" },
    [],
    "",
  );
  assert.deepEqual(
    functional.map((row) => row.id),
    ["unit-1"],
  );
});

test("the ESN filter matches any listed identifier", () => {
  const result = applyInventoryFilters(rows, emptyInventoryFilters, ["YJN32X4T79"], "");
  assert.deepEqual(
    result.map((row) => row.id),
    ["unit-2"],
  );

  const partial = applyInventoryFilters(rows, emptyInventoryFilters, ["MD9NJ"], "");
  assert.deepEqual(
    partial.map((row) => row.id),
    ["unit-3"],
  );
});

test("search matches across product, identifier, status, and location", () => {
  assert.equal(applyInventoryFilters(rows, emptyInventoryFilters, [], "iphone 13").length, 1);
  assert.equal(applyInventoryFilters(rows, emptyInventoryFilters, [], "scarborough").length, 2);
  assert.equal(applyInventoryFilters(rows, emptyInventoryFilters, [], "MD9NJ71FJ9").length, 1);
  assert.equal(applyInventoryFilters(rows, emptyInventoryFilters, [], "nothing-here").length, 0);
});

test("status, grade, and location filters match exactly", () => {
  assert.equal(applyInventoryFilters(rows, { ...emptyInventoryFilters, status: "Sold" }, [], "").length, 1);
  assert.equal(applyInventoryFilters(rows, { ...emptyInventoryFilters, grade: "C Grade" }, [], "").length, 3);
  assert.equal(
    applyInventoryFilters(rows, { ...emptyInventoryFilters, location: "Vaughan" }, [], "").length,
    1,
  );
});

test("uniqueValues trims, drops blanks, and sorts", () => {
  assert.deepEqual(uniqueValues([" Apple ", "", null, "Samsung", "Apple"]), ["Apple", "Samsung"]);
});
