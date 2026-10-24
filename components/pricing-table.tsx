"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";

import { fetchPricingData, saveInventoryPricesBulkAction } from "../app/dashboard/pricing/bulk-save-actions";

export type PricingRow = Readonly<{
  id: string;
  sourceSku: string;
  manufacturer: string;
  model: string;
  variant: string;
  network: string;
  capacity: string;
  color: string;
  grade: string;
  damages: string;
  quantity: number;
}>;

export type PricingSaveState = Readonly<{
  isSaving: boolean;
  message: string | null;
  error: string | null;
}>;

/** The handle the toolbar uses to trigger a save of the whole result set. */
export type PricingTableHandle = {
  save: () => void;
};

type PricingTableProps = {
  /** The rows shown on the current page. */
  rows: PricingRow[];
  /**
   * Every row in the active filtered result set. Saving submits all of them,
   * so a price edited on page 1 is not lost when the table is on page 2.
   */
  saveTargets: PricingRow[];
  organizationId: string;
  /** True when the visible page is a subset of the save targets. */
  isFiltered: boolean;
  /** Notifies the toolbar so it can show the save status. */
  onSaveStateChange?: ((state: PricingSaveState) => void) | undefined;
};

export const PricingTable = forwardRef<PricingTableHandle, PricingTableProps>(function PricingTable(
  { rows, saveTargets, organizationId, isFiltered, onSaveStateChange },
  ref,
) {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [activeFlags, setActiveFlags] = useState<Map<string, boolean>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const visibleSkuIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);

  useEffect(() => {
    let cancelled = false;
    // `rows` is a dependency so the table reloads its prices after a CSV
    // upload refreshes the route. Only keep prices for SKUs on screen.
    fetchPricingData(organizationId)
      .then((pricing) => {
        if (cancelled) return;
        const priceMap = new Map<string, number>();
        const activeMap = new Map<string, boolean>();
        for (const item of pricing) {
          if (!visibleSkuIds.has(item.skuId)) continue;
          if (item.price !== null) priceMap.set(item.skuId, item.price);
          activeMap.set(item.skuId, item.isActive ?? true);
        }
        setPrices(priceMap);
        setActiveFlags(activeMap);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, visibleSkuIds]);

  const handlePriceChange = (skuId: string, value: string) => {
    const parsed = value.trim() === "" ? null : Number(value);
    setPrices((prev) => {
      const next = new Map(prev);
      if (parsed === null) next.delete(skuId);
      else next.set(skuId, parsed);
      return next;
    });
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleActiveChange = (skuId: string, checked: boolean) => {
    setActiveFlags((prev) => {
      const next = new Map(prev);
      next.set(skuId, checked);
      return next;
    });
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    // Submit every row in the filtered result set, not only the visible page.
    const updates = saveTargets.map((row) => ({
      sourceSku: row.sourceSku,
      price: prices.get(row.id) ?? null,
      isActive: activeFlags.get(row.id) ?? true,
    }));

    try {
      const result = await saveInventoryPricesBulkAction({ organizationId, updates });
      if (result.errors.length > 0 || result.failed > 0) {
        setSaveError(
          `Saved ${result.saved.toLocaleString()} of ${updates.length.toLocaleString()} price(s). ${result.errors[0] ?? "Some prices could not be saved."}`,
        );
      } else {
        setSaveMessage(`Saved ${result.saved.toLocaleString()} price(s).`);
      }
    } catch {
      setSaveError("Could not save prices. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [activeFlags, organizationId, prices, saveTargets]);

  // Report the save status up to the toolbar so the top action bar can show
  // the result next to the Save button.
  useEffect(() => {
    onSaveStateChange?.({ isSaving, message: saveMessage, error: saveError });
  }, [isSaving, onSaveStateChange, saveError, saveMessage]);

  // Let the top action bar's Save button save the whole filtered result set.
  useImperativeHandle(
    ref,
    () => ({
      save: () => void handleSave(),
    }),
    [handleSave],
  );

  if (isLoading) {
    return (
      <div className="pricing-table-wrap">
        <p className="sr-only">Loading prices…</p>
        <p>Loading prices…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="pricing-table-wrap">
        <p className="sr-only">No available inventory items to price.</p>
        <p>No available inventory items found. Import or mark inventory as available to set prices.</p>
      </div>
    );
  }

  return (
    <div className="pricing-table-form">
      <div className="pricing-table-wrap">
        <table className="catalog-table pricing-table pricing-table-main">
          <caption className="sr-only">Available inventory pricing</caption>
          <thead>
            <tr>
              <th className="catalog-checkbox-column pricing-th-check" scope="col">
                <input type="checkbox" aria-label="Select all" />
              </th>
              <th scope="col">SKU</th>
              <th scope="col">Manufacturer</th>
              <th scope="col">Model</th>
              <th scope="col">Variant</th>
              <th scope="col">Network</th>
              <th scope="col">Capacity</th>
              <th scope="col">Color</th>
              <th scope="col">Grade</th>
              <th scope="col">Damages</th>
              <th scope="col">Quantity</th>
              <th scope="col">Paid</th>
              <th scope="col" className="pricing-th-price">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="catalog-checkbox-column pricing-td-check">
                  <input type="checkbox" aria-label={`Select ${row.sourceSku}`} />
                </td>
                <td className="pricing-td-sku">{row.sourceSku}</td>
                <td>{row.manufacturer || "—"}</td>
                <td>{row.model || "—"}</td>
                <td>{row.variant || "—"}</td>
                <td>{row.network || "—"}</td>
                <td>{row.capacity || "—"}</td>
                <td>{row.color || "—"}</td>
                <td>{row.grade || "—"}</td>
                <td>{row.damages || "—"}</td>
                <td>{row.quantity}</td>
                <td className="pricing-td-paid">
                  <input
                    type="checkbox"
                    defaultChecked={activeFlags.get(row.id) ?? true}
                    onChange={(ev) => handleActiveChange(row.id, ev.target.checked)}
                    aria-label={`Set default price active for ${row.sourceSku}`}
                  />
                </td>
                <td className="pricing-td-price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={prices.get(row.id) ?? ""}
                    placeholder="0.00"
                    onChange={(ev) => handlePriceChange(row.id, ev.target.value)}
                    aria-label={`Default sales price for ${row.sourceSku}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pricing-form-actions">
        <button
          className="primary-button"
          disabled={isSaving}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? "Saving…" : "Save prices"}
        </button>
        <span className="pricing-save-scope">
          {isFiltered
            ? `Saves all ${saveTargets.length.toLocaleString()} filtered SKU(s), not just this page.`
            : "Saves every price on this page."}
        </span>
      </div>
    </div>
  );
});
