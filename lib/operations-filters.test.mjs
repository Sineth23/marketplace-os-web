import assert from "node:assert/strict";
import test from "node:test";

import {
  applyOperationsFilters,
  countBy,
  distinctValues,
  hasActiveOperationsFilters,
  operationsFilterQuery,
  paginateOperationsRows,
  parseOperationsFilters,
  parsePageNumber,
} from "./operations-filters.ts";

const rows = [
  { id: "1", sku: "IPHONE17-256", status: "Sold", grade: "A Grade", location: "Scarborough" },
  { id: "2", sku: "IPHONE17-128", status: "Available", grade: "B Grade", location: "Chesswood" },
  { id: "3", sku: "MACBOOK-512", status: "Sold", grade: "A Grade", location: "Chesswood" },
];

const fields = (row) => ({
  search: `${row.sku} ${row.id}`,
  status: row.status,
  grade: row.grade,
  location: row.location,
});

test("reads filters from the query string", () => {
  const filters = parseOperationsFilters({
    q: "  iphone  ",
    status: "Sold",
    grade: "",
  });
  assert.equal(filters.search, "iphone");
  assert.equal(filters.status, "Sold");
  assert.equal(filters.grade, "");
});

test("builds a query string with only the narrowed values", () => {
  const filters = parseOperationsFilters({ q: "iphone", status: "Sold" });
  const query = operationsFilterQuery(filters);
  assert.equal(query, "?q=iphone&status=Sold");
});

test("builds an empty query string when nothing is narrowed", () => {
  assert.equal(operationsFilterQuery(parseOperationsFilters({})), "");
});

test("reports whether any filter is active", () => {
  assert.equal(hasActiveOperationsFilters(parseOperationsFilters({})), false);
  assert.equal(hasActiveOperationsFilters(parseOperationsFilters({ q: "x" })), true);
  assert.equal(hasActiveOperationsFilters(parseOperationsFilters({ status: "Sold" })), true);
});

test("keeps extra values when building a query string", () => {
  const filters = parseOperationsFilters({ q: "iphone" });
  assert.equal(operationsFilterQuery(filters, { page: "3" }), "?q=iphone&page=3");
});

test("matches the search term case-insensitively", () => {
  const filters = parseOperationsFilters({ q: "iphone" });
  const result = applyOperationsFilters(rows, filters, fields);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((row) => row.id),
    ["1", "2"],
  );
});

test("applies every active filter together", () => {
  const filters = parseOperationsFilters({ status: "Sold", grade: "A Grade" });
  const result = applyOperationsFilters(rows, filters, fields);
  assert.deepEqual(
    result.map((row) => row.id),
    ["1", "3"],
  );
});

test("returns every row when nothing is filtered", () => {
  const result = applyOperationsFilters(rows, parseOperationsFilters({}), fields);
  assert.equal(result.length, 3);
});

test("paginates a result set and clamps the page", () => {
  const page = paginateOperationsRows(rows, 1, 2);
  assert.equal(page.pageRows.length, 2);
  assert.equal(page.pageCount, 2);
  assert.equal(page.currentPage, 1);

  const second = paginateOperationsRows(rows, 2, 2);
  assert.equal(second.pageRows.length, 1);
  assert.equal(second.currentPage, 2);

  const beyond = paginateOperationsRows(rows, 9, 2);
  assert.equal(beyond.currentPage, 2, "a page past the end clamps to the last page");
});

test("paginates an empty result set safely", () => {
  const page = paginateOperationsRows([], 1, 10);
  assert.equal(page.pageRows.length, 0);
  assert.equal(page.pageCount, 1);
  assert.equal(page.currentPage, 1);
});

test("reads a page number and clamps it to a positive integer", () => {
  assert.equal(parsePageNumber(undefined), 1);
  assert.equal(parsePageNumber("0"), 1);
  assert.equal(parsePageNumber("-3"), 1);
  assert.equal(parsePageNumber("abc"), 1);
  assert.equal(parsePageNumber("4"), 4);
  assert.equal(parsePageNumber("2.7"), 2);
});

test("counts and lists the distinct values of a field", () => {
  const counts = countBy(rows, (row) => row.location);
  assert.equal(counts.get("Chesswood"), 2);
  assert.equal(counts.get("Scarborough"), 1);
  assert.deepEqual(
    distinctValues(rows, (row) => row.location),
    ["Chesswood", "Scarborough"],
  );
});
