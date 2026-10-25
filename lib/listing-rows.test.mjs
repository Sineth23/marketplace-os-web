import assert from "node:assert/strict";
import test from "node:test";

import { availableProvider, compareListing, summarizeListings, unavailableProvider } from "./listing-rows.ts";
import {
  fixtureListingProviders,
  fixtureMapping,
  fixtureRow,
  fixtureTenantQuantities,
  withFixtureMappings,
} from "./listing-fixtures.ts";

test("reports a match when the provider and the tenant agree", () => {
  const row = fixtureRow({ catalogSku: "A", quantity: 3 });
  const ours = new Map([["A", 3]]);
  const comparison = compareListing(row, ours);
  assert.equal(comparison.kind, "match");
});

test("reports a mismatch with the signed difference", () => {
  const row = fixtureRow({ catalogSku: "A", quantity: 2 });
  const ours = new Map([["A", 3]]);
  const comparison = compareListing(row, ours);
  assert.equal(comparison.kind, "mismatch");
  if (comparison.kind === "mismatch") {
    assert.equal(comparison.tenantQuantity, 3);
    assert.equal(comparison.difference, -1);
  }
});

test("treats a provider that reported no quantity as unknown, not as zero", () => {
  const row = fixtureRow({ catalogSku: "A", quantity: null });
  const ours = new Map([["A", 3]]);
  const comparison = compareListing(row, ours);
  assert.equal(comparison.kind, "provider-unknown");
});

test("treats a listing with no mapping as unlinked", () => {
  const row = fixtureRow({ catalogSku: null, quantity: 5 });
  const comparison = compareListing(row, new Map([["A", 3]]));
  assert.equal(comparison.kind, "unlinked");
});

test("treats a listing whose catalog sku is unknown as unlinked", () => {
  const row = fixtureRow({ catalogSku: "MISSING", quantity: 5 });
  const comparison = compareListing(row, new Map([["A", 3]]));
  assert.equal(comparison.kind, "unlinked");
});

test("counts a provider that reported no quantity separately from a zero", () => {
  const providers = [
    availableProvider(
      "bestbuy",
      [
        fixtureRow({ provider: "bestbuy", catalogSku: "A", quantity: 3 }),
        fixtureRow({ provider: "bestbuy", catalogSku: "B", quantity: null }),
        fixtureRow({ provider: "bestbuy", catalogSku: "C", quantity: 0 }),
      ],
      { fetchedAt: "2026-10-25T10:00:00.000Z", truncated: false },
    ),
  ];
  const ours = new Map([
    ["A", 3],
    ["B", 1],
    ["C", 1],
  ]);
  const summary = summarizeListings(providers, ours);
  assert.equal(summary.withQuantity, 2, "a zero is a reported quantity");
  assert.equal(summary.withoutQuantity, 1);
});

test("counts linked and unlinked listings separately", () => {
  const providers = [
    availableProvider("ebay", [fixtureRow({ catalogSku: "A" }), fixtureRow({ catalogSku: null })], {
      fetchedAt: "2026-10-25T10:00:00.000Z",
      truncated: false,
    }),
  ];
  const summary = summarizeListings(providers, new Map([["A", 1]]));
  assert.equal(summary.linkedListings, 1);
  assert.equal(summary.unlinkedListings, 1);
  assert.equal(summary.totalListings, 2);
});

test("counts an unavailable provider separately and does not lose the others", () => {
  const providers = [
    availableProvider("reebelo", [fixtureRow({ provider: "reebelo" })], {
      fetchedAt: "2026-10-25T10:00:00.000Z",
      truncated: false,
    }),
    unavailableProvider("amazon", "not connected"),
  ];
  const summary = summarizeListings(providers, new Map([["SKU-1", 2]]));
  assert.equal(summary.readableProviders, 1);
  assert.equal(summary.unavailableProviders, 1);
  assert.equal(summary.totalListings, 1, "the unavailable provider contributes no rows");
});

test("a zero provider quantity against a positive tenant count is a mismatch", () => {
  const row = fixtureRow({ catalogSku: "A", quantity: 0 });
  const comparison = compareListing(row, new Map([["A", 3]]));
  assert.equal(comparison.kind, "mismatch");
  if (comparison.kind === "mismatch") {
    assert.equal(comparison.difference, -3);
  }
});

test("the fixture providers produce the three comparison states", () => {
  const ours = fixtureTenantQuantities;
  const providers = withFixtureMappings(fixtureListingProviders, fixtureMapping);
  const rows = providers.flatMap((provider) => provider.rows);
  const kinds = new Set(rows.map((row) => compareListing(row, ours).kind));
  assert.ok(kinds.has("match"), "expected a matching listing");
  assert.ok(kinds.has("mismatch"), "expected a differing listing");
  assert.ok(kinds.has("unlinked"), "expected an unlinked listing");
  assert.ok(kinds.has("provider-unknown"), "expected a listing with no reported quantity");
});
