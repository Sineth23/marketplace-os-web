"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateInventoryPricesFromCsv } from "../app/dashboard/pricing/actions";

export type BulkPricingRow = Readonly<{
  id: string;
  sourceSku: string;
  manufacturer: string;
  model: string;
  capacity: string;
  grade: string;
  price: number | null;
  isActive: boolean;
}>;

type BulkPricingFormProps = {
  rows: readonly BulkPricingRow[];
  organizationId: string;
};

export function BulkPricingForm({ rows, organizationId }: BulkPricingFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggleRow = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
    setSuccess(null);
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const targets = rows.filter((row) => selected.has(row.id));
    if (targets.length === 0) {
      setError("Select at least one SKU.");
      return;
    }

    const price = Number(amount);
    if (amount.trim() === "" || !Number.isFinite(price) || price < 0) {
      setError("Enter a price of 0 or more.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateInventoryPricesFromCsv({
        organizationId,
        updates: targets.map((row) => ({
          sourceSku: row.sourceSku,
          price,
          // Preserve each SKU's current active flag instead of re-enabling it.
          isActive: row.isActive,
        })),
      });

      if (result.error) {
        setError("Could not save prices. Please try again.");
        return;
      }

      setSuccess(
        `Set the default price for ${targets.length.toLocaleString()} SKU(s) to ${price.toFixed(2)}.`,
      );
      setSelected(new Set());
      setAmount("");
      router.refresh();
    } catch {
      setError("Could not save prices. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="pricing-table-wrap">
        <p>No available inventory items found. Import or mark inventory as available to set prices.</p>
      </div>
    );
  }

  return (
    <form className="bulk-pricing-form" onSubmit={handleSubmit}>
      <div className="bulk-pricing-controls">
        <label className="bulk-pricing-amount">
          <span>New default price</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
              setSuccess(null);
            }}
          />
        </label>
        <button className="primary-button" type="submit" disabled={isSaving || selected.size === 0}>
          {isSaving ? "Saving…" : `Apply to ${selected.size.toLocaleString()} selected`}
        </button>
        <button
          className="quiet-button"
          type="button"
          onClick={() => setSelected(new Set())}
          disabled={isSaving || selected.size === 0}
        >
          Clear selection
        </button>
      </div>

      {error ? <p className="form-message error">{error}</p> : null}
      {success ? <p className="form-message success-banner">{success}</p> : null}

      <div className="pricing-table-wrap">
        <table className="catalog-table pricing-table">
          <caption className="sr-only">Available inventory pricing</caption>
          <thead>
            <tr>
              <th className="catalog-checkbox-column pricing-th-check" scope="col">
                <input
                  type="checkbox"
                  aria-label="Select all SKUs"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th scope="col">SKU</th>
              <th scope="col">Manufacturer</th>
              <th scope="col">Model</th>
              <th scope="col">Capacity</th>
              <th scope="col">Grade</th>
              <th scope="col">Current price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="catalog-checkbox-column pricing-td-check">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.sourceSku}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                </td>
                <td className="pricing-td-sku">{row.sourceSku}</td>
                <td>{row.manufacturer || "—"}</td>
                <td>{row.model || "—"}</td>
                <td>{row.capacity || "—"}</td>
                <td>{row.grade || "—"}</td>
                <td>{row.price === null ? "—" : row.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="catalog-pagination" aria-label="Inventory pages">
        <span>Showing {rows.length.toLocaleString()} item(s)</span>
      </nav>
    </form>
  );
}
