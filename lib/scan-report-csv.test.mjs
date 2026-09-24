import assert from "node:assert/strict";
import test from "node:test";

import { parseScanInventoryCsv, parseScanResultsCsv } from "./scan-report-csv.ts";

test("maps paired WholeCell scan and inventory exports", () => {
  const results = parseScanResultsCsv(
    'Scan,Result,Manufacturer,Model,Variant,Network,Capacity,Color,Grade,Conditions,ESN,ID,Status,Location,Scanned At,Scanned By\n4np,Audited,Apple,"MacBook Pro, 2018",A1990,Wi-Fi,512GB,Space Gray,C Grade,,N/A,4NP,Available,Scarborough,2026-08-11,Fadel',
  );
  const inventory = parseScanInventoryCsv(
    'Device,Grade,Damages,ID,ESN,Status,Location,Scanned At,Scanned By\n"Apple MacBook Pro, 2018",C Grade,,4NP,N/A,Available,Scarborough,2026-08-11,Fadel',
  );
  assert.equal(results[0]?.sourceUnitId, "4NP");
  assert.equal(results[0]?.serialNumber, undefined);
  assert.equal(results[0]?.result, "Audited");
  assert.equal(inventory[0]?.device, "Apple MacBook Pro, 2018");
  assert.equal(inventory[0]?.serialNumber, undefined);
});

test("rejects missing required report columns and unsupported result labels", () => {
  assert.throws(() => parseScanResultsCsv("Scan,Result\n1,Audited"), /include ID/);
  assert.throws(() => parseScanResultsCsv("Scan,Result,ESN,ID\n1,Unknown,,1"), /unsupported Result/);
});

test("keeps result rows without product details for operator review", () => {
  const [row] = parseScanResultsCsv("Result,ESN,ID\nNot Found,N/A,");
  assert.equal(row?.result, "Not Found");
  assert.equal(row?.manufacturer, undefined);
  assert.equal(row?.sourceUnitId, undefined);
});
