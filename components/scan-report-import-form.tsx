"use client";

import { useActionState, useState } from "react";

import {
  approveScanReportAction,
  createScanReportPreviewAction,
  type ScanReportActionState,
} from "../app/dashboard/actions";
import type { ScanReportBatch, ScanReportPreview } from "../lib/api";
import { parseScanInventoryCsv, parseScanResultsCsv } from "../lib/scan-report-csv";

const MAX_PREVIEW_BYTES = 3_500_000;
const emptyState: ScanReportActionState = { message: "", error: false, batch: null };

export function ScanReportImportForm({
  organizationId,
  initialBatch,
}: Readonly<{ organizationId: string; initialBatch: ScanReportBatch | null }>) {
  const [createState, createPreview, creating] = useActionState(createScanReportPreviewAction, emptyState);
  const [approveState, approve, approving] = useActionState(approveScanReportAction, emptyState);
  const [preview, setPreview] = useState<ScanReportPreview | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ results?: File; inventory?: File }>({});
  const [fileNames, setFileNames] = useState({ results: "", inventory: "" });
  const [selectionChanged, setSelectionChanged] = useState(false);
  const [error, setError] = useState("");
  const [payloadTooLarge, setPayloadTooLarge] = useState(false);
  const batch = !selectionChanged ? (approveState.batch ?? createState.batch ?? initialBatch) : null;

  async function readFiles(resultsFile?: File, inventoryFile?: File) {
    setSelectionChanged(Boolean(resultsFile || inventoryFile));
    setPreview(null);
    setError("");
    setPayloadTooLarge(false);
    setFileNames({ results: resultsFile?.name ?? "", inventory: inventoryFile?.name ?? "" });
    if (!resultsFile || !inventoryFile) return;
    try {
      const nextPreview: ScanReportPreview = {
        resultsFileName: resultsFile.name,
        inventoryFileName: inventoryFile.name,
        results: parseScanResultsCsv(await resultsFile.text()),
        inventoryItems: parseScanInventoryCsv(await inventoryFile.text()),
      };
      setPreview(nextPreview);
      setPayloadTooLarge(
        new TextEncoder().encode(JSON.stringify(nextPreview)).byteLength > MAX_PREVIEW_BYTES,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read these CSV files.");
    }
  }

  return (
    <section className="scan-report-import">
      <form action={createPreview}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="preview" value={preview ? JSON.stringify(preview) : ""} />
        <div className="scan-report-file-pair">
          <label className="file-picker" htmlFor="scan-results-file">
            <span>
              <strong>1. Scan Results CSV</strong>
              <small>{fileNames.results || "Select the WholeCell Scan Results export."}</small>
            </span>
            <input
              id="scan-results-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                const files = {
                  ...(selectedFiles.inventory ? { inventory: selectedFiles.inventory } : {}),
                  ...(selected ? { results: selected } : {}),
                };
                setSelectedFiles(files);
                void readFiles(files.results, files.inventory);
              }}
            />
          </label>
          <label className="file-picker" htmlFor="scan-inventory-file">
            <span>
              <strong>2. Inventory Items CSV</strong>
              <small>{fileNames.inventory || "Select the matching WholeCell Inventory Items export."}</small>
            </span>
            <input
              id="scan-inventory-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                const files = {
                  ...(selectedFiles.results ? { results: selectedFiles.results } : {}),
                  ...(selected ? { inventory: selected } : {}),
                };
                setSelectedFiles(files);
                void readFiles(files.results, files.inventory);
              }}
            />
          </label>
        </div>
        {error ? (
          <p className="form-message error" role="alert">
            {error}
          </p>
        ) : null}
        {payloadTooLarge ? (
          <p className="form-message error">
            These files exceed the safe preview size. Export a smaller matching scan report.
          </p>
        ) : null}
        {preview ? (
          <div className="import-preview" aria-live="polite">
            <strong>Local paired-file preview</strong>
            <span>
              {preview.results.length.toLocaleString()} scan results ·{" "}
              {preview.inventoryItems.length.toLocaleString()} inventory items
            </span>
            <small>Preview creates a saved review only. It does not change inventory or WholeCell.</small>
          </div>
        ) : null}
        <button className="primary-button" type="submit" disabled={creating || !preview || payloadTooLarge}>
          {creating ? "Saving server preview…" : "Create server preview"}
        </button>
        {createState.message ? (
          <p className={createState.error ? "form-message error" : "form-message"}>{createState.message}</p>
        ) : null}
      </form>
      {batch ? (
        <div className="import-preview" aria-live="polite">
          <strong>Server review · {batch.status === "approved" ? "Approved" : "Awaiting approval"}</strong>
          <span>
            {batch.resultsFileName} + {batch.inventoryFileName}
          </span>
          <div className="scan-report-preview-stats">
            <span>{batch.summary.expectedCount.toLocaleString()} expected</span>
            <span>{batch.summary.auditedCount.toLocaleString()} audited</span>
            <span>{batch.summary.remainingCount.toLocaleString()} remaining</span>
            <span>{batch.summary.overageCount.toLocaleString()} overage</span>
          </div>
          <div className="inventory-table-wrap import-preview-table">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Result</th>
                  <th>Product</th>
                  <th>ID</th>
                  <th>ESN</th>
                  <th>Grade</th>
                  <th>Conditions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {batch.results.slice(0, 8).map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.result}</td>
                    <td>
                      {[row.manufacturer, row.model, row.variant].filter(Boolean).join(" ") ||
                        "Product details unavailable"}
                    </td>
                    <td>{row.sourceUnitId ?? "—"}</td>
                    <td>{row.serialNumber ?? "—"}</td>
                    <td>{row.grade ?? "—"}</td>
                    <td>{row.conditions ?? "—"}</td>
                    <td>{row.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small>
            Showing the first {Math.min(batch.results.length, 8)} scan-result rows. Approval saves this report
            snapshot only.
          </small>
          {batch.summary.overageCount > 0 ? (
            <p className="form-message">
              Audit count is above expected inventory. Review the overage before approval.
            </p>
          ) : null}
          {batch.status === "preview" ? (
            <form action={approve}>
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="batchId" value={batch.id} />
              <button className="primary-button" type="submit" disabled={approving}>
                {approving ? "Approving report…" : "Approve and save scan report"}
              </button>
            </form>
          ) : (
            <p className="form-message success">This report is saved. Inventory was not changed.</p>
          )}
        </div>
      ) : null}
      {approveState.message ? (
        <p className={approveState.error ? "form-message error" : "form-message success"} role="status">
          {approveState.message}
        </p>
      ) : null}
    </section>
  );
}
