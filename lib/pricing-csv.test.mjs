import assert from "node:assert/strict";
import test from "node:test";

import {
  PRICING_CSV_HEADERS,
  parsePricingCsv,
  serializePricingCsv,
  toBulkPriceUpdatePayload,
} from "./pricing-csv.ts";

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

test("parses this app's own export", () => {
  const csv = serializePricingCsv([
    { sourceSku: "SKU-1", manufacturer: "Apple", price: 249.5 },
    { sourceSku: "SKU-2", manufacturer: "Samsung", price: null },
  ]);
  const { updates, errors } = parsePricingCsv(csv);

  assert.deepEqual(errors, []);
  assert.deepEqual(updates, [
    { sourceSku: "SKU-1", price: 249.5, isActive: true },
    { sourceSku: "SKU-2", price: null, isActive: true },
  ]);
});

test("parses an inventory export with an ID column before SKU", () => {
  const csv = [
    "ID,SKU,Manufacturer,Model,Variant,Network,Capacity,Color,Grade,Damages,Quantity,Price",
    '2634745,IPHONE7A177832GBLACC,Apple,iPhone 7,A1778,Unlocked,32GB,Black,C Grade,"",1,68.99',
    '2634893,ZFLIP421128GREYA,Samsung,Z Flip 4,SM-721,Wi-Fi,128GB,Black,A Grade,"",1,290.00',
  ].join("\r\n");
  const { updates, errors } = parsePricingCsv(csv);

  assert.deepEqual(errors, []);
  assert.deepEqual(updates, [
    { sourceSku: "IPHONE7A177832GBLACC", price: 68.99, isActive: true },
    { sourceSku: "ZFLIP421128GREYA", price: 290, isActive: true },
  ]);
});

test("parses a headerless inventory export with an ID column", () => {
  const csv = "2634745,SKU-12,Apple,iPhone 7,A1778,Unlocked,32GB,Black,C Grade,,1,68.99";
  const { updates, errors } = parsePricingCsv(csv);

  assert.deepEqual(errors, []);
  assert.deepEqual(updates, [{ sourceSku: "SKU-12", price: 68.99, isActive: true }]);
});

test("handles quoted commas, escaped quotes, and currency formatting", () => {
  const csv = ["ID,SKU,Manufacturer,Model,Price", '1,SKU-9,Apple,"MacBook Pro, 14""","$1,299.99"'].join(
    "\r\n",
  );
  const { updates, errors } = parsePricingCsv(csv);

  assert.deepEqual(errors, []);
  assert.deepEqual(updates, [{ sourceSku: "SKU-9", price: 1299.99, isActive: true }]);
});

test("reports an invalid price instead of saving it", () => {
  const { updates, errors } = parsePricingCsv("SKU,Price\r\nSKU-BAD,not-a-number");

  assert.equal(updates.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /SKU SKU-BAD: invalid price/);
});

test("reports a missing Price column", () => {
  const { updates, errors } = parsePricingCsv("SKU,Manufacturer\r\nSKU-1,Apple");

  assert.equal(updates.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Price column/);
});

test("omits blank prices from the bulk payload", () => {
  const payload = toBulkPriceUpdatePayload([
    { sourceSku: "SKU-1", price: 12.5, isActive: true },
    { sourceSku: "SKU-2", price: null, isActive: true },
  ]);

  assert.deepEqual(payload, [
    { sourceSku: "SKU-1", price: 12.5, isActive: true },
    { sourceSku: "SKU-2", isActive: true },
  ]);
  assert.equal("price" in payload[1], false);
});

test("keeps a zero price in the bulk payload", () => {
  const [update] = toBulkPriceUpdatePayload([{ sourceSku: "SKU-3", price: 0, isActive: true }]);

  assert.equal(update.price, 0);
});
