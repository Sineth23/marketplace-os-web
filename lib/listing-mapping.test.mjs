import assert from "node:assert/strict";
import test from "node:test";

import { buildMappingRows, suggestCatalogSkus, summarizeMappings } from "./listing-mapping.ts";
import { fixtureRow } from "./listing-fixtures.ts";

test("suggests the catalog sku when the provider sku matches exactly", () => {
  const row = fixtureRow({ providerSku: "IPHONE16PM256BLK", title: "iPhone 16 Pro Max" });
  const suggestions = suggestCatalogSkus(row, ["IPHONE16PM256BLK", "IPHONE16PM256WHT", "SAMSUNGS23FE256"]);
  // The exact match ranks first, and the grade variant is still offered because
  // it is the same product.
  assert.equal(suggestions[0], "IPHONE16PM256BLK");
  assert.ok(suggestions.includes("IPHONE16PM256WHT"));
  assert.ok(!suggestions.includes("SAMSUNGS23FE256"), "an unrelated sku is not suggested");
});

test("suggests catalog skus that share the provider's distinctive tokens", () => {
  const row = fixtureRow({ providerSku: "IPHONE16PM256BLK", title: "iPhone 16 Pro Max" });
  const suggestions = suggestCatalogSkus(row, ["IPHONE16PM256WHT", "IPHONE16PM256BLK", "SAMSUNGS23FE256"]);
  assert.ok(suggestions.includes("IPHONE16PM256BLK"));
  assert.ok(suggestions.includes("IPHONE16PM256WHT"));
  assert.ok(!suggestions.includes("SAMSUNGS23FE256"), "an unrelated sku is not suggested");
});

test("suggests nothing when nothing resembles the provider sku", () => {
  const row = fixtureRow({ providerSku: "UNRELATED-SKU", title: "Nothing alike" });
  assert.deepEqual(suggestCatalogSkus(row, ["IPHONE16PM256BLK", "SAMSUNGS23FE256"]), []);
});

test("suggests nothing when the provider reports no sku and no title", () => {
  const row = fixtureRow({ providerSku: null, title: "" });
  assert.deepEqual(suggestCatalogSkus(row, ["IPHONE16PM256BLK"]), []);
});

test("marks a listing with a mapping as linked", () => {
  const rows = buildMappingRows(
    [fixtureRow({ providerSku: "IPHONE16PM256BLK" })],
    new Map([["ebay:IPHONE16PM256BLK", "IPHONE16PM256BLK"]]),
    ["IPHONE16PM256BLK"],
  );
  assert.equal(rows[0]?.state, "linked");
  assert.equal(rows[0]?.catalogSku, "IPHONE16PM256BLK");
});

test("marks a listing without a mapping as unlinked and offers suggestions", () => {
  const rows = buildMappingRows([fixtureRow({ providerSku: "IPHONE16PM256BLK" })], new Map(), [
    "IPHONE16PM256BLK",
    "IPHONE16PM256WHT",
  ]);
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
    ["CATALOG-1"],
  );
  assert.equal(rows[0]?.state, "linked");
  assert.equal(rows[1]?.state, "unlinked");
});

test("summarizes linked, unlinked, rejected and suggested counts", () => {
  const rows = buildMappingRows(
    [
      fixtureRow({ providerSku: "MAPPED-1" }),
      fixtureRow({ providerSku: "UNMAPPED-1" }),
      fixtureRow({ providerSku: "UNMAPPED-2" }),
    ],
    new Map([["ebay:MAPPED-1", "CATALOG-1"]]),
    ["MAPPED-1", "CATALOG-1", "UNMAPPED-1", "UNMAPPED-2"],
  );
  const summary = summarizeMappings(rows);
  assert.equal(summary.total, 3);
  assert.equal(summary.linked, 1);
  assert.equal(summary.unlinked, 2);
  assert.equal(summary.rejected, 0);
  assert.equal(summary.withSuggestions, 2);
});
