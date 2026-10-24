import assert from "node:assert/strict";
import test from "node:test";

import {
  parseInventoryExport,
  parseOrganizationExport,
  parsePricingExport,
  parseProcessBatchExport,
  parseProductExport,
  parsePurchaseOrderExport,
  parseSalesOrderExport,
} from "./partner-export-csv.ts";

// The real partner process batch export column set.
const batchCsv = [
  "Manufacturer,Model,Variant,Network,Capacity,Color,Grade,Damages,ID,ESN,Status",
  'Apple,AirPods 2nd Gen,A2032,Wi-Fi,N/A,White,B Grade,"",V0,N/A,Sold',
  'Apple,"MacBook Air (13-inch, 2020)","A2179 (8GB RAM, 1.1GHz i3)",Wi-Fi,256GB,Silver,A Grade,"",1D5,C02D464LMNHQ,Sold',
  "Apple,Watch Series SE,44MM GPS,GPS,N/A,Space Grey,B Grade,iCloud Locked,16J,N/A,Sold",
].join("\n");

test("maps a process batch export onto the unit fields", () => {
  const preview = parseProcessBatchExport(batchCsv);

  assert.equal(preview.rows.length, 3);
  assert.deepEqual(preview.rejected, []);

  const [first, second, third] = preview.rows;
  assert.equal(first?.unitId, "V0");
  assert.equal(first?.serialNumber, undefined, "N/A is an absent serial, not a value");
  assert.equal(first?.manufacturer, "Apple");
  assert.equal(first?.model, "AirPods 2nd Gen");
  assert.equal(first?.variant, "A2032");
  assert.equal(first?.network, "Wi-Fi");
  assert.equal(first?.capacity, undefined, "N/A capacity is absent");
  assert.equal(first?.color, "White");
  assert.equal(first?.grade, "B Grade");
  assert.equal(first?.damages, undefined, "an empty quoted cell is absent");
  assert.equal(first?.status, "Sold");

  assert.equal(second?.model, "MacBook Air (13-inch, 2020)");
  assert.equal(second?.variant, "A2179 (8GB RAM, 1.1GHz i3)");
  assert.equal(second?.serialNumber, "C02D464LMNHQ");

  assert.equal(third?.damages, "iCloud Locked");
});

test("reports columns the parser did not read", () => {
  const preview = parseProcessBatchExport(
    [
      "Manufacturer,Model,Variant,Network,Capacity,Color,Grade,Damages,ID,ESN,Status,Location,Order,Sold",
      "V0,N/A,N/A,N/A,N/A,N/A,B Grade,,V0,N/A,Sold,Scarborough,SO #4,$100.00",
    ].join("\n"),
  );
  // Location and Order are read by the parser; the sold-price column is not.
  assert.deepEqual(preview.unmappedColumns, ["Sold"]);
  const [row] = preview.rows;
  assert.equal(row?.unitId, "V0");
  assert.equal(row?.location, "Scarborough");
  assert.equal(row?.salesOrder, "SO #4");
});

test("keeps a row without a unit identifier as an explicit finding", () => {
  const preview = parseProcessBatchExport("Manufacturer,Model,ID\nApple,Mac,,V0");
  assert.equal(preview.rows.length, 0);
  assert.deepEqual(preview.rejected, [{ rowNumber: 2, message: "The unit identifier is required." }]);
});

test("requires an identifier column", () => {
  assert.throws(() => parseProcessBatchExport("Manufacturer,Model\nApple,Mac"), /include an ID/);
});

test("reads an inventory export with order links, prices and custom fields", () => {
  const preview = parseInventoryExport(
    [
      "ID,ESN,Manufacturer,Model,Grade,Damages,Status,Location,Purchase Order,Order,Sale Price,List Price,Custom Field: Battery Health,Custom Field: Marketplace Status",
      "5DQ,DX3H8N6BN72J,Apple,iPhone 13,A Grade,,Sold,Scarborough,PO #90,SO #44,479.99,499.99,94,Connected",
      "1CN,N/A,Apple,iMac,B Grade,Cracked Glass,Available,Chesswood,,,,,",
    ].join("\n"),
  );

  assert.equal(preview.rows.length, 2);
  const [first, second] = preview.rows;
  assert.equal(first?.unitId, "5DQ");
  assert.equal(first?.serialNumber, "DX3H8N6BN72J");
  assert.equal(first?.purchaseOrder, "PO #90");
  assert.equal(first?.salesOrder, "SO #44");
  assert.equal(first?.salePrice, 479.99);
  assert.equal(first?.listPrice, 499.99);
  assert.deepEqual(first?.customFields, { "Battery Health": "94", "Marketplace Status": "Connected" });

  assert.equal(second?.serialNumber, undefined);
  assert.equal(second?.damages, "Cracked Glass");
  assert.deepEqual(second?.customFields, {});
});

test("reads prices written with a currency symbol", () => {
  const preview = parseInventoryExport('ID,List Price\nV0,"$1,229.99"\nV1,"$479.99"');
  assert.equal(preview.rows[0]?.listPrice, 1229.99);
  assert.equal(preview.rows[1]?.listPrice, 479.99);
});

test("reads a purchase order export", () => {
  const preview = parsePurchaseOrderExport(
    "ID,Date,Channel,Vendor,Devices,Transaction,Status\nPO #90,10/19/26,Retail,Retail - Local,207,PO-4471,New",
  );
  assert.equal(preview.rows.length, 1);
  const [row] = preview.rows;
  assert.equal(row?.sequentialId, "PO #90");
  assert.equal(row?.date, "2026-10-19");
  assert.equal(row?.channel, "Retail");
  assert.equal(row?.organization, "Retail - Local");
  assert.equal(row?.quantity, 207);
  assert.equal(row?.transactionNumber, "PO-4471");
  assert.equal(row?.status, "New");
});

test("reads a pricing export", () => {
  const preview = parsePricingExport(
    "SKU,Manufacturer,Model,Grade,Price,Quantity,Conditions\nIPHONE17A3258256GBBLACOB,Apple,iPhone 17,A Grade,999.99,12,OPEN BOX",
  );
  assert.equal(preview.rows.length, 1);
  const [row] = preview.rows;
  assert.equal(row?.sku, "IPHONE17A3258256GBBLACOB");
  assert.equal(row?.price, 999.99);
  assert.equal(row?.quantity, 12);
  assert.equal(row?.conditions, "OPEN BOX");
});

test("reads a product catalog export", () => {
  const preview = parseProductExport(
    "ID,SKU,Product,Grade,Conditions\n6672111,IPHONE17A3258256GBBLACOB,Apple iPhone 17,A Grade,OPEN BOX",
  );
  assert.equal(preview.rows.length, 1);
  const [row] = preview.rows;
  assert.equal(row?.sku, "IPHONE17A3258256GBBLACOB");
  assert.equal(row?.productId, "6672111");
  assert.equal(row?.title, "Apple iPhone 17");
  assert.equal(row?.conditions, "OPEN BOX");
});

test("reads an organization export", () => {
  const preview = parseOrganizationExport("Name,Created At\nRachel,09/21/2026\n");
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0]?.name, "Rachel");
  assert.equal(preview.rows[0]?.createdAt, "2026-09-21");
});

test("reads a sales order export", () => {
  const preview = parseSalesOrderExport(
    "ID,Date,Channel,Customer,Status,Items,Amount\nSO #44,05/12/24,Retail,Retail - Local,Shipped,2,959.98",
  );
  assert.equal(preview.rows.length, 1);
  const [row] = preview.rows;
  assert.equal(row?.sequentialId, "SO #44");
  assert.equal(row?.date, "2024-05-12");
  assert.equal(row?.customer, "Retail - Local");
  assert.equal(row?.quantity, 2);
  assert.equal(row?.amount, 959.98);
});

test("matches headers regardless of case and punctuation", () => {
  const preview = parsePricingExport("sku,Manufacturer,MODEL,price\nSKU-1,Apple,iPhone,10.5");
  assert.equal(preview.rows[0]?.sku, "SKU-1");
  assert.equal(preview.rows[0]?.model, "iPhone");
  assert.equal(preview.rows[0]?.price, 10.5);
});
