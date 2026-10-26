import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMappingRows,
  filterToInventoryMatches,
  gradesAgree,
  summarizeMappings,
  suggestCatalogRecords,
} from "./listing-mapping.ts";
import { fixtureRow } from "./listing-fixtures.ts";

const catalog = [
  { sku: "IPHONE16PM256BLK", grade: "A Grade", conditions: null, quantity: 3 },
  { sku: "IPHONE16PM256WHT", grade: "B Grade", conditions: null, quantity: 1 },
  { sku: "SAMSUNGS23FE256", grade: "A Grade", conditions: null, quantity: 1 },
  { sku: "MACBOOKPRO256SPACEGREYA", grade: "A Grade", conditions: null, quantity: 2 },
];

test("suggests the catalog record when the provider sku matches exactly", () => {
  const row = fixtureRow({ providerSku: "IPHONE16PM256BLK", title: "iPhone 16 Pro Max" });
  const suggestions = suggestCatalogRecords(row, catalog);
  assert.equal(suggestions[0]?.record.sku, "IPHONE16PM256BLK");
});

test("suggests catalog records that share the provider's distinctive parts", () => {
  const row = fixtureRow({ providerSku: "IPHONE16PM256BLK", title: "iPhone 16 Pro Max" });
  const suggestions = suggestCatalogRecords(row, catalog);
  const skus = suggestions.map((s) => s.record.sku);
  assert.ok(skus.includes("IPHONE16PM256BLK"));
  assert.ok(skus.includes("IPHONE16PM256WHT"));
  assert.ok(!skus.includes("SAMSUNGS23FE256"), "an unrelated sku is not suggested");
});

test("suggests nothing when nothing resembles the provider sku", () => {
  const row = fixtureRow({ providerSku: "UNRELATED-SKU", title: "Nothing alike" });
  assert.deepEqual(suggestCatalogRecords(row, catalog), []);
});

test("suggests nothing when the provider reports no sku", () => {
  const row = fixtureRow({ providerSku: null, title: "A product" });
  assert.deepEqual(suggestCatalogRecords(row, catalog), []);
});

test("treats an absent grade as agreement, because it is not evidence of a difference", () => {
  assert.equal(gradesAgree(undefined, "A Grade"), true);
  assert.equal(gradesAgree("A Grade", undefined), true);
  assert.equal(gradesAgree(null, null), true);
});

test("compares grades on their leading word", () => {
  assert.equal(gradesAgree("A Grade", "A Grade"), true);
  assert.equal(gradesAgree("A Grade", "A"), true);
  assert.equal(gradesAgree("B Grade", "A Grade"), false);
  assert.equal(gradesAgree("OPEN BOX", "A Grade"), false);
});

test("ranks a record whose grade agrees above one whose grade does not", () => {
  const row = fixtureRow({
    providerSku: "IPHONE16PM256BLK",
    title: "iPhone 16 Pro Max",
    rawState: "A Grade",
  });
  const suggestions = suggestCatalogRecords(row, catalog);
  const bGradeIndex = suggestions.findIndex((s) => s.record.sku === "IPHONE16PM256WHT");
  const aGradeIndex = suggestions.findIndex((s) => s.record.sku === "IPHONE16PM256BLK");
  assert.ok(aGradeIndex < bGradeIndex, "the agreeing grade is offered first");
  assert.equal(suggestions[aGradeIndex]?.gradeAgrees, true);
  assert.equal(suggestions[bGradeIndex]?.gradeAgrees, false);
});

test("marks a listing with a mapping as linked", () => {
  const rows = buildMappingRows(
    [fixtureRow({ providerSku: "IPHONE16PM256BLK" })],
    new Map([["ebay:IPHONE16PM256BLK", "IPHONE16PM256BLK"]]),
    catalog,
  );
  assert.equal(rows[0]?.state, "linked");
  assert.equal(rows[0]?.catalogSku, "IPHONE16PM256BLK");
});

test("marks a listing without a mapping as unlinked and offers suggestions", () => {
  const rows = buildMappingRows([fixtureRow({ providerSku: "IPHONE16PM256BLK" })], new Map(), catalog);
  assert.equal(rows[0]?.state, "unlinked");
  assert.equal(rows[0]?.catalogSku, null);
  assert.ok(rows[0]?.candidates.length);
});

test("keys the mapping by provider and provider sku, not by a listing id", () => {
  // The same provider sku on two providers is two different mappings.
  const rows = buildMappingRows(
    [
      fixtureRow({ provider: "ebay", providerSku: "SHARED-SKU" }),
      fixtureRow({ provider: "bestbuy", providerSku: "SHARED-SKU" }),
    ],
    new Map([["ebay:SHARED-SKU", "CATALOG-1"]]),
    catalog,
  );
  assert.equal(rows[0]?.state, "linked");
  assert.equal(rows[1]?.state, "unlinked");
});

test("keeps only the listings that could match the tenant's own inventory", () => {
  const rows = buildMappingRows(
    [fixtureRow({ providerSku: "IPHONE16PM256BLK" }), fixtureRow({ providerSku: "SOMETHING-ELSE-ENTIRELY" })],
    new Map(),
    catalog,
  );
  const filtered = filterToInventoryMatches(rows);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.listing.providerSku, "IPHONE16PM256BLK");
});

test("keeps every listing when the unmatchable ones are asked for", () => {
  const rows = buildMappingRows(
    [fixtureRow({ providerSku: "IPHONE16PM256BLK" }), fixtureRow({ providerSku: "SOMETHING-ELSE-ENTIRELY" })],
    new Map(),
    catalog,
  );
  assert.equal(filterToInventoryMatches(rows, { includeUnmatchable: true }).length, 2);
});

test("summarizes linked, unlinked, rejected and suggested counts", () => {
  const rows = buildMappingRows(
    [
      fixtureRow({ providerSku: "MAPPED-1" }),
      fixtureRow({ providerSku: "UNMAPPED-1" }),
      fixtureRow({ providerSku: "UNMAPPED-2" }),
    ],
    new Map([["ebay:MAPPED-1", "IPHONE16PM256BLK"]]),
    catalog,
  );
  const summary = summarizeMappings(rows);
  assert.equal(summary.total, 3);
  assert.equal(summary.linked, 1);
  assert.equal(summary.unlinked, 2);
  assert.equal(summary.rejected, 0);
});

test("counts the unmapped listings that have no candidate separately", () => {
  const rows = buildMappingRows(
    [fixtureRow({ providerSku: "IPHONE16PM256BLK" }), fixtureRow({ providerSku: "NOTHING-ALIKE-HERE" })],
    new Map(),
    catalog,
  );
  const summary = summarizeMappings(rows);
  assert.equal(summary.withSuggestions, 1);
  assert.equal(summary.withoutSuggestions, 1);
});
