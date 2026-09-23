"use client";

import { useActionState } from "react";
import { useState } from "react";

import {
  approveInventoryImportAction,
  createInventoryPreviewAction,
  type InventoryImportActionState,
} from "../app/dashboard/actions";
import type { InventoryImportBatch } from "../lib/api";
import { parseInventoryCsv, type InventoryCsvPreview } from "../lib/inventory-csv";

const MAX_PREVIEW_ACTION_BYTES = 3_500_000;

type InventoryImportFormProps = Readonly<{
  organizationId: string;
  initialBatch: InventoryImportBatch | null;
}>;

const initialState: InventoryImportActionState = { message: "", error: false, batch: null };

export function InventoryImportForm({ organizationId, initialBatch }: InventoryImportFormProps) {
  const [previewState, createPreview, previewPending] = useActionState(
    createInventoryPreviewAction,
    initialState,
  );
  const [approvalState, approveBatch, approvalPending] = useActionState(
    approveInventoryImportAction,
    initialState,
  );
  const [preview, setPreview] = useState<InventoryCsvPreview | undefined>();
  const [fileName, setFileName] = useState("");
  const [selectionChanged, setSelectionChanged] = useState(false);
  const [parseError, setParseError] = useState("");
  const [payloadError, setPayloadError] = useState("");
  const previewMatchesSelection = !selectionChanged;
  const displayedBatch = previewMatchesSelection
    ? (approvalState.batch ?? previewState.batch ?? initialBatch)
    : null;
  const approvedBatch =
    approvalState.batch?.status === "approved"
      ? approvalState.batch
      : initialBatch?.status === "approved"
        ? initialBatch
        : null;

  async function reviewFile(file: File | undefined) {
    setPreview(undefined);
    setFileName(file?.name ?? "");
    setSelectionChanged(Boolean(file));
    setParseError("");
    setPayloadError("");
    if (!file) return;
    try {
      const parsedPreview = parseInventoryCsv(await file.text());
      setPreview(parsedPreview);
      const previewPayload = JSON.stringify({
        organizationId,
        sourceFileName: file.name,
        rows: parsedPreview.rows,
        rejected: parsedPreview.rejected,
      });
      if (new TextEncoder().encode(previewPayload).byteLength > MAX_PREVIEW_ACTION_BYTES) {
        setPayloadError(
          "This CSV has too much inventory data for one preview. Split it into smaller CSVs and preview each separately.",
        );
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to read this CSV.");
    }
  }

  return (
    <section className="inventory-import-form">
      <form action={createPreview}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="sourceFileName" value={fileName} />
        <input type="hidden" name="rows" value={preview ? JSON.stringify(preview.rows) : ""} />
        <input type="hidden" name="rejected" value={preview ? JSON.stringify(preview.rejected) : ""} />
        <label className="file-picker" htmlFor="inventory-file">
          <span className="file-picker-icon" aria-hidden="true">
            ↑
          </span>
          <span>
            <strong>Choose a WholeCell inventory CSV</strong>
            <small>
              Preview catalog SKU plus device ID, ESN/serial, grade, damages, location, and status.
            </small>
          </span>
          {/* Parsed in the browser; do not repost the raw CSV with the mapped preview rows. */}
          <input
            id="inventory-file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) => void reviewFile(event.target.files?.[0])}
          />
        </label>
        {parseError ? <p className="form-message error">{parseError}</p> : null}
        {payloadError ? <p className="form-message error">{payloadError}</p> : null}
        {preview ? (
          <div className="import-preview" aria-live="polite">
            <strong>Local preview ready</strong>
            <span>
              {preview.rows.length.toLocaleString()} device rows from {preview.headers.length} columns.
              {preview.rejected.length > 0 ? ` ${preview.rejected.length} row needs attention.` : ""}
            </span>
            <div className="inventory-table-wrap import-preview-table">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>CSV row</th>
                    <th>SKU</th>
                    <th>WholeCell ID</th>
                    <th>ESN / serial</th>
                    <th>Grade</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>{row.sku}</td>
                      <td>{row.sourceUnitId ?? "—"}</td>
                      <td>{row.serialNumber ?? "—"}</td>
                      <td>{row.grade ?? "—"}</td>
                      <td>{row.location ?? "—"}</td>
                      <td>{row.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <small>Showing the first {Math.min(preview.rows.length, 8)} rows.</small>
          </div>
        ) : null}
        <button
          className="primary-button"
          type="submit"
          disabled={previewPending || !preview || Boolean(payloadError)}
        >
          {previewPending ? "Saving preview…" : "Create server preview"}
        </button>
        {previewState.message ? (
          <p className={previewState.error ? "form-message error" : "form-message"}>{previewState.message}</p>
        ) : null}
      </form>

      {displayedBatch ? (
        <div className="import-preview" aria-live="polite">
          <strong>Server preview {displayedBatch.id}</strong>
          <span>
            {displayedBatch.rowCount.toLocaleString()} source rows ·{" "}
            {displayedBatch.skuCount.toLocaleString()} catalog SKUs ·{" "}
            {displayedBatch.unitCount.toLocaleString()} candidate units ·{" "}
            {displayedBatch.rejected.length.toLocaleString()} rows need attention.
          </span>
          {displayedBatch.rejected.length ? (
            <details className="rejected-rows">
              <summary>Review validation findings</summary>
              <ul>
                {displayedBatch.rejected.slice(0, 20).map((row) => (
                  <li key={`${row.rowNumber}-${row.message}`}>
                    Row {row.rowNumber}: {row.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {displayedBatch.status === "preview" ? (
            <form action={approveBatch}>
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="batchId" value={displayedBatch.id} />
              <button className="primary-button" type="submit" disabled={approvalPending}>
                {approvalPending ? "Approving reviewed rows…" : "Approve and import units"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      {approvalState.message ? (
        <p className={approvalState.error ? "form-message error" : "form-message"}>{approvalState.message}</p>
      ) : null}
      {approvedBatch ? (
        <p className="form-message">
          {approvedBatch.result?.importedCount ?? 0} new and {approvedBatch.result?.updatedCount ?? 0} updated
          catalog SKUs were saved.
        </p>
      ) : null}
    </section>
  );
}
