"use client";

import { useActionState } from "react";
import { useState } from "react";

import { importInventoryAction } from "../app/dashboard/actions";
import { parseInventoryCsv, type InventoryCsvPreview } from "../lib/inventory-csv";

type InventoryImportFormProps = Readonly<{ organizationId: string }>;

const initialInventoryImportState = {
  message: "",
  error: false,
  consolidatedRows: 0,
  rejected: [] as readonly Readonly<{ rowNumber: number; message: string }>[],
};

export function InventoryImportForm({ organizationId }: InventoryImportFormProps) {
  const [state, action, pending] = useActionState(importInventoryAction, initialInventoryImportState);
  const [preview, setPreview] = useState<InventoryCsvPreview | undefined>();
  const [parseError, setParseError] = useState("");

  async function reviewFile(file: File | undefined) {
    setPreview(undefined);
    setParseError("");
    if (!file) return;
    try {
      setPreview(parseInventoryCsv(await file.text()));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to read this CSV.");
    }
  }

  return (
    <form className="inventory-import-form" action={action}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="rows" value={preview ? JSON.stringify(preview.rows) : ""} />
      <label className="file-picker" htmlFor="inventory-file">
        <span className="file-picker-icon" aria-hidden="true">
          ↑
        </span>
        <span>
          <strong>Choose a WholeCell inventory CSV</strong>
          <small>
            We use SKU and catalog columns only. Serial numbers and operational fields are ignored.
          </small>
        </span>
        <input
          id="inventory-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(event) => void reviewFile(event.target.files?.[0])}
        />
      </label>
      {parseError ? <p className="form-message error">{parseError}</p> : null}
      {preview ? (
        <div className="import-preview" aria-live="polite">
          <strong>Review ready</strong>
          <span>
            {preview.rows.length.toLocaleString()} catalog rows from {preview.headers.length} columns.
            {preview.rejected.length > 0 ? ` ${preview.rejected.length} row needs attention.` : ""}
          </span>
          <div className="inventory-table-wrap import-preview-table">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>CSV row</th>
                  <th>SKU</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 8).map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.sku}</td>
                    <td>{row.manufacturer ?? "—"}</td>
                    <td>{row.model ?? "—"}</td>
                    <td>{row.grade ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small>
            Showing the first {Math.min(preview.rows.length, 8)} rows. Approval sends this reviewed catalog to
            the tenant import API.
          </small>
        </div>
      ) : null}
      <button className="primary-button" type="submit" disabled={pending || !preview}>
        {pending ? "Importing reviewed rows…" : "Approve and import"}
      </button>
      {state.message ? (
        <p className={state.error ? "form-message error" : "form-message"}>{state.message}</p>
      ) : null}
      {state.consolidatedRows > 0 ? (
        <p className="form-message">
          {state.consolidatedRows} repeated inventory-unit row
          {state.consolidatedRows === 1 ? " was" : "s were"} consolidated into those catalog SKUs.
        </p>
      ) : null}
      {state.rejected.length > 0 ? (
        <details className="rejected-rows">
          <summary>
            {state.rejected.length} row{state.rejected.length === 1 ? "" : "s"} need attention
          </summary>
          <ul>
            {state.rejected.slice(0, 20).map((row) => (
              <li key={`${row.rowNumber}-${row.message}`}>
                Row {row.rowNumber}: {row.message}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </form>
  );
}
