import assert from "node:assert/strict";
import test from "node:test";

import {
  filterAmazonListings,
  parseAmazonStateFilter,
  sortAmazonListings,
  summarizeAmazonListings,
} from "./amazon-listing-state.ts";

const fixture = [
  { id: "a", displayState: "inactive", fulfillmentType: "merchant" },
  { id: "b", displayState: "active", fulfillmentType: "amazon" },
  { id: "c", displayState: "suppressed", fulfillmentType: "unknown" },
  { id: "d", displayState: "active", fulfillmentType: "merchant" },
  { id: "e", displayState: "incomplete", fulfillmentType: "merchant" },
];

test("summary counts states and fulfillment", () => {
  const summary = summarizeAmazonListings(fixture);
  assert.equal(summary.total, 5);
  assert.deepEqual(summary.byState, {
    active: 2,
    inactive: 1,
    incomplete: 1,
    suppressed: 1,
    unknown: 0,
  });
  assert.equal(summary.amazonFulfilled, 1);
  assert.equal(summary.merchantFulfilled, 3);
});

test("sort puts Active first and is stable", () => {
  assert.deepEqual(
    sortAmazonListings(fixture).map((l) => l.id),
    ["b", "d", "a", "e", "c"],
  );
});

test("filter accepts only known states", () => {
  assert.equal(parseAmazonStateFilter("bogus"), "all");
  assert.equal(parseAmazonStateFilter("active"), "active");
  assert.deepEqual(
    filterAmazonListings(fixture, "inactive").map((l) => l.id),
    ["a"],
  );
  assert.equal(filterAmazonListings(fixture, "all").length, 5);
});
