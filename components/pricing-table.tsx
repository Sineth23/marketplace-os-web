"use client";

import { useEffect, useState } from "react";
import { fetchPricingData, updateInventoryPricesAction, type PriceUpdate } from "../app/dashboard/pricing/actions";

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

type PricingTableProps = {
  rows: PricingRow[];
  organizationId: string;
};

export function PricingTable({ rows, organizationId }: PricingTableProps) {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [activeFlags, setActiveFlags] = useState<Map<string, boolean>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPricingData(organizationId).then((pricing) => {
      if (cancelled) return;
      const priceMap = new Map<string, number>();
      const activeMap = new Map<string, boolean>();
      for (const item of pricing) {
        if (item.price !== null) priceMap.set(item.skuId, item.price);
        activeMap.set(item.skuId, item.isActive ?? true);
      }
      setPrices(priceMap);
      setActiveFlags(activeMap);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [organizationId]);

  const handlePriceChange = (skuId: string, value: string) => {
    const parsed = value.trim() === "" ? null : Number(value);
    setPrices((prev) => {
      const next = new Map(prev);
      if (parsed === null) next.delete(skuId);
      else next.set(skuId, parsed);
      return next;
    });
    setSaveError(null);
  };

  const handleActiveChange = (skuId: string, checked: boolean) => {
    setActiveFlags((prev) => {
      const next = new Map(prev);
      next.set(skuId, checked);
      return next;
    });
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const updates: PriceUpdate[] = rows.map((row) => ({
      skuId: row.id,
      price: prices.get(row.id) ?? null,
      isActive: activeFlags.get(row.id) ?? true,
    }));

    try {
      const result = await updateInventoryPricesAction({ organizationId, updates });
      if (result.error) {
        setSaveError("Could not save prices. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

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
    <form onSubmit={handleSave} className="pricing-table-form">
      {saveError && <p className="form-message error">{saveError}</p>}
      <div className="pricing-table-wrap">
        <table className="inventory-table pricing-table">
          <caption className="sr-only">Available inventory pricing</caption>
          <thead>
            <tr>
              <th className="pricing-th-check"><input type="checkbox" aria-label="Select all" /></th>
              <th>SKU</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Variant</th>
              <th>Network</th>
              <th>Capacity</th>
              <th>Color</th>
              <th>Grade</th>
              <th>Damages</th>
              <th>Quantity</th>
              <th>Paid</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="pricing-td-check">
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
        <button type="submit" className="primary-button" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save prices"}
        </button>
      </div>
    </form>
  );
}
