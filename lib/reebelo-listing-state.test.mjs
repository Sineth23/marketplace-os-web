import assert from "node:assert/strict";
import test from "node:test";

import {
  filterReebeloOffers,
  parseReebeloStateFilter,
  sortReebeloOffers,
  summarizeReebeloOffers,
} from "./reebelo-listing-state.ts";

const fixture = [
  { id: "a", displayState: "inactive" },
  { id: "b", displayState: "active" },
  { id: "c", displayState: "unknown" },
  { id: "d", displayState: "active" },
  { id: "e", displayState: "incomplete" },
];

test("summary counts every state", () => {
  assert.deepEqual(summarizeReebeloOffers(fixture), {
    total: 5,
    byState: { active: 2, inactive: 1, incomplete: 1, unknown: 1 },
  });
});

test("sort puts Active first and is stable", () => {
  assert.deepEqual(
    sortReebeloOffers(fixture).map((offer) => offer.id),
    ["b", "d", "a", "e", "c"],
  );
});

test("filter accepts only known states", () => {
  assert.equal(parseReebeloStateFilter("bogus"), "all");
  assert.equal(parseReebeloStateFilter("incomplete"), "incomplete");
  assert.deepEqual(
    filterReebeloOffers(fixture, "inactive").map((offer) => offer.id),
    ["a"],
  );
  assert.equal(filterReebeloOffers(fixture, "all").length, 5);
});
