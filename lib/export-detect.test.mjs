import assert from "node:assert/strict";
import test from "node:test";

import { detectExportKind, parseForKind } from "./export-detect.ts";

// The real partner process batch export column set.
const batchCsv = [
  "Manufacturer,Model,Variant,Network,Capacity,Color,Grade,Damages,ID,ESN,Status",
  "Apple,AirPods 2nd Gen,A2032,Wi-Fi,N/A,White,B Grade,,V0,N/A,Sold",
].join("\n");

const inventoryCsv = [
  "ID,ESN,Manufacturer,Model,Grade,Damages,Status,Location",
  "5DQ,DX3H8N6BN72J,Apple,iPhone 13,A Grade,,Sold,Scarborough",
].join("\n");

const purchaseOrderCsv = [
  "ID,Date,Channel,Vendor,Devices,Transaction,Status",
  "PO #90,10/19/26,Retail,Retail - Local,207,PO-4471,New",
].join("\n");

const pricingCsv = [
  "SKU,Manufacturer,Model,Grade,Price,Quantity",
  "SKU-1,Apple,iPhone 17,A Grade,999.99,12",
].join("\n");

const productCsv = ["ID,SKU,Product,Grade,Conditions", "6672111,SKU-1,Apple iPhone 17,A Grade,OPEN BOX"].join(
  "\n",
);

const organizationCsv = ["Name,Created At", "Rachel,09/21/2026"].join("\n");

test("detects a process batch export", () => {
  const result = detectExportKind(batchCsv, "batch.csv");
  assert.ok("detection" in result, "expected a detection");
  assert.equal(result.detection.kind, "processBatch");
  assert.equal(result.detection.label, "Process batch");
  assert.equal(result.detection.rowCount, 1);
  assert.deepEqual(result.detection.rejected, []);
  assert.deepEqual(result.detection.unmappedColumns, []);
});

test("detects an inventory export", () => {
  const result = detectExportKind(inventoryCsv, "inventory.csv");
  assert.ok("detection" in result);
  assert.equal(result.detection.kind, "inventory");
  assert.equal(result.detection.rowCount, 1);
});

test("detects a purchase order export", () => {
  const result = detectExportKind(purchaseOrderCsv, "po.csv");
  assert.ok("detection" in result);
  assert.equal(result.detection.kind, "purchaseOrder");
  assert.equal(result.detection.rowCount, 1);
});

test("detects a pricing export", () => {
  const result = detectExportKind(pricingCsv, "pricing.csv");
  assert.ok("detection" in result);
  assert.equal(result.detection.kind, "pricing");
  assert.equal(result.detection.rowCount, 1);
});

test("detects a product catalog export", () => {
  const result = detectExportKind(productCsv, "products.csv");
  assert.ok("detection" in result);
  assert.equal(result.detection.kind, "productCatalog");
  assert.equal(result.detection.rowCount, 1);
});

test("detects an organization export", () => {
  const result = detectExportKind(organizationCsv, "orgs.csv");
  assert.ok("detection" in result);
  assert.equal(result.detection.kind, "organization");
  assert.equal(result.detection.rowCount, 1);
});

test("reports a file that matches nothing", () => {
  const result = detectExportKind("Alpha,Beta\n1,2", "unknown.csv");
  assert.ok("failure" in result);
  assert.match(result.failure.message, /does not match any supported export/);
});

test("reports a file that matches more than one kind instead of guessing", () => {
  // A name, a sku and a price could be a pricing export or an organization
  // export. Both match, so detection must refuse to guess.
  const result = detectExportKind("Name,SKU,Price\nAcme,SKU-1,10", "ambiguous.csv");
  assert.ok("failure" in result, "expected detection to refuse to guess");
  assert.match(result.failure.message, /more than one export type/);
  assert.ok(result.failure.candidates && result.failure.candidates.length >= 2);
});

test("reports an unreadable file", () => {
  const result = detectExportKind('a,"unclosed', "broken.csv");
  assert.ok("failure" in result);
  assert.match(result.failure.message, /unclosed quoted value/);
});

test("parses the detected kind through the shared entry point", () => {
  const preview = parseForKind("processBatch", batchCsv);
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0]?.unitId, "V0");
  assert.equal(preview.rows[0]?.model, "AirPods 2nd Gen");
});
