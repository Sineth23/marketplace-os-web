import assert from "node:assert/strict";
import test from "node:test";

import { parseInventoryCsv } from "./inventory-csv.ts";

test("maps WholeCell ID and treats N/A ESNs as missing", () => {
  const preview = parseInventoryCsv(
    [
      "SKU,ID,ESN,Manufacturer,Model",
      "SKU-1,WC-001,N/A,Bose,QuietComfort Ultra",
      "SKU-2,WC-002,C02ABC123,Apple,MacBook Pro",
    ].join("\n"),
  );

  assert.equal(preview.rows.length, 2);
  assert.equal(preview.rows[0]?.sourceUnitId, "WC-001");
  assert.equal(preview.rows[0]?.serialNumber, undefined);
  assert.equal(preview.rows[1]?.sourceUnitId, "WC-002");
  assert.equal(preview.rows[1]?.serialNumber, "C02ABC123");
  assert.deepEqual(preview.rejected, []);
});

test("keeps missing-SKU records as explicit row-level findings", () => {
  const preview = parseInventoryCsv("SKU,ID,ESN\n,WC-001,N/A\nSKU-2,WC-002,N/A");

  assert.equal(preview.rows.length, 1);
  assert.deepEqual(preview.rejected, [{ rowNumber: 2, message: "SKU is required." }]);
  assert.equal(preview.rows[0]?.sourceUnitId, "WC-002");
  assert.equal(preview.rows[0]?.serialNumber, undefined);
});
