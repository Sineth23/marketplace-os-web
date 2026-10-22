import assert from "node:assert/strict";
import test from "node:test";

import { PRICING_CSV_HEADERS, serializePricingCsv } from "./pricing-csv.ts";

function lines(csv) {
  return csv.trimEnd().split("\r\n");
}

test("writes the header the pricing uploader expects", () => {
  const [header] = lines(serializePricingCsv([]));

  assert.equal(header, PRICING_CSV_HEADERS.join(","));
  assert.equal(header.split(",").length, 17);
  assert.equal(header.split(",")[0], "SKU");
  assert.equal(header.split(",")[16], "Price");
});

test("keeps 17 columns so a downloaded file can be re-uploaded", () => {
  const csv = serializePricingCsv([{ sourceSku: "SKU-1", manufacturer: "Apple", price: 249.5 }]);
  const row = lines(csv)[1];

  assert.equal(row.split(",").length, 17);
  assert.equal(row.split(",")[0], "SKU-1");
  assert.equal(row.split(",")[16], "249.5");
});

test("leaves the price column empty when a SKU has no price", () => {
  const row = lines(serializePricingCsv([{ sourceSku: "SKU-2", price: null }]))[1];

  assert.equal(row.split(",")[16], "");
});

test("quotes values containing commas or quotes", () => {
  const row = lines(serializePricingCsv([{ sourceSku: "SKU-3", model: 'Pro, 14"', price: 1 }]))[1];

  assert.ok(row.includes('"Pro, 14"""'), row);
  assert.equal(row.slice(row.lastIndexOf(",") + 1), "1");
});
