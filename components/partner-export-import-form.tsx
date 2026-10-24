"use client";

import { useActionState } from "react";
import { useState } from "react";

import {
  approvePartnerExportAction,
  createPartnerExportPreviewAction,
  type PartnerExportActionState,
} from "../app/dashboard/actions";
import type { PartnerExportBatch } from "../lib/api";
import { detectExportKind, parseForKind, type ExportKind } from "../lib/export-detect";

const MAX_PREVIEW_ACTION_BYTES = 3_500_000;

/** The columns shown in the preview table, per export kind. */
const previewColumns: Readonly<
  Record<
    ExportKind,
    readonly Readonly<{ label: string; get: (row: Record<string, unknown>) => string | undefined }>[]
  >
> = {
  inventory: [
    { label: "Unit ID", get: (row) => row.unitId as string | undefined },
    { label: "Serial / ESN", get: (row) => row.serialNumber as string | undefined },
    { label: "Manufacturer", get: (row) => row.manufacturer as string | undefined },
    { label: "Model", get: (row) => row.model as string | undefined },
    { label: "Grade", get: (row) => row.grade as string | undefined },
    { label: "Status", get: (row) => row.status as string | undefined },
    { label: "Location", get: (row) => row.location as string | undefined },
  ],
  processBatch: [
    { label: "Unit ID", get: (row) => row.unitId as string | undefined },
    { label: "Serial / ESN", get: (row) => row.serialNumber as string | undefined },
    { label: "Manufacturer", get: (row) => row.manufacturer as string | undefined },
    { label: "Model", get: (row) => row.model as string | undefined },
    { label: "Grade", get: (row) => row.grade as string | undefined },
    { label: "Status", get: (row) => row.status as string | undefined },
  ],
  purchaseOrder: [
    { label: "Order", get: (row) => row.sequentialId as string | undefined },
    { label: "Date", get: (row) => row.date as string | undefined },
    { label: "Channel", get: (row) => row.channel as string | undefined },
    { label: "Vendor", get: (row) => row.organization as string | undefined },
    { label: "Devices", get: (row) => (row.quantity === undefined ? undefined : String(row.quantity)) },
    { label: "Status", get: (row) => row.status as string | undefined },
  ],
  pricing: [
    { label: "SKU", get: (row) => row.sku as string | undefined },
    { label: "Manufacturer", get: (row) => row.manufacturer as string | undefined },
    { label: "Model", get: (row) => row.model as string | undefined },
    { label: "Grade", get: (row) => row.grade as string | undefined },
    { label: "Price", get: (row) => (row.price === undefined ? undefined : String(row.price)) },
    { label: "Quantity", get: (row) => (row.quantity === undefined ? undefined : String(row.quantity)) },
  ],
  productCatalog: [
    { label: "SKU", get: (row) => row.sku as string | undefined },
    { label: "Product", get: (row) => row.title as string | undefined },
    { label: "Grade", get: (row) => row.grade as string | undefined },
    { label: "Conditions", get: (row) => row.conditions as string | undefined },
  ],
  organization: [
    { label: "Name", get: (row) => row.name as string | undefined },
    { label: "Created", get: (row) => row.createdAt as string | undefined },
  ],
  salesOrder: [
    { label: "Order", get: (row) => row.sequentialId as string | undefined },
    { label: "Date", get: (row) => row.date as string | undefined },
    { label: "Channel", get: (row) => row.channel as string | undefined },
    { label: "Customer", get: (row) => row.customer as string | undefined },
    { label: "Status", get: (row) => row.status as string | undefined },
    { label: "Amount", get: (row) => (row.amount === undefined ? undefined : String(row.amount)) },
  ],
};

type PartnerExportFormProps = Readonly<{
  organizationId: string;
  initialBatch: PartnerExportBatch | null;
}>;

const initialState: PartnerExportActionState = { message: "", error: false, batch: null };

export function PartnerExportForm({ organizationId, initialBatch }: PartnerExportFormProps) {
  const [previewState, createPreview, previewPending] = useActionState(
    createPartnerExportPreviewAction,
    initialState,
  );
  const [approvalState, approveBatch, approvalPending] = useActionState(
    approvePartnerExportAction,
    initialState,
  );
  const [fileName, setFileName] = useState("");
  const [kind, setKind] = useState<ExportKind | undefined>();
  const [detectedLabel, setDetectedLabel] = useState("");
  const [rows, setRows] = useState<readonly Record<string, unknown>[]>([]);
  const [rejected, setRejected] = useState<readonly Readonly<{ rowNumber: number; message: string }>[]>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<readonly string[]>([]);
  const [parseError, setParseError] = useState("");
  const [payloadError, setPayloadError] = useState("");

  async function reviewFile(file: File | undefined) {
    setKind(undefined);
    setRows([]);
    setRejected([]);
    setUnmappedColumns([]);
    setFileName(file?.name ?? "");
    setParseError("");
    setPayloadError("");
    if (!file) return;
    try {
      const text = await file.text();
      const detected = detectExportKind(text, file.name);
      if ("failure" in detected) {
        setParseError(detected.failure.message);
        return;
      }
      const parsed = parseForKind<Record<string, unknown>>(detected.detection.kind, text);
      setKind(detected.detection.kind);
      setDetectedLabel(detected.detection.label);
      setRows(parsed.rows as readonly Record<string, unknown>[]);
      setRejected(parsed.rejected);
      setUnmappedColumns(parsed.unmappedColumns);

      const previewPayload = JSON.stringify({
        organizationId,
        sourceFileName: file.name,
        exportKind: detected.detection.kind,
        rows: parsed.rows,
        rejected: parsed.rejected,
      });
      if (new TextEncoder().encode(previewPayload).byteLength > MAX_PREVIEW_ACTION_BYTES) {
        setPayloadError(
          "This file has too much data for one preview. Split it into smaller files and preview each separately.",
        );
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to read this file.");
    }
  }

  const columns = kind ? previewColumns[kind] : [];
  const displayedBatch = approvalState.batch ?? previewState.batch ?? initialBatch;

  return (
    <section className="inventory-import-form">
      <form action={createPreview}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="sourceFileName" value={fileName} />
        <input type="hidden" name="exportKind" value={kind ?? ""} />
        <input type="hidden" name="rows" value={rows.length ? JSON.stringify(rows) : ""} />
        <input type="hidden" name="rejected" value={rejected.length ? JSON.stringify(rejected) : ""} />
        <label className="file-picker" htmlFor="partner-export-file">
          <span className="file-picker-icon" aria-hidden="true">
            ↑
          </span>
          <span>
            <strong>Choose an exported inventory file</strong>
            <small>
              The file type is detected from its columns. Inventory, process batch, purchase order, sales
              order, pricing, product catalog, and organization exports are supported.
            </small>
          </span>
          {/* Parsed in the browser; do not repost the raw file with the mapped preview rows. */}
          <input
            id="partner-export-file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) => void reviewFile(event.target.files?.[0])}
          />
        </label>
        {parseError ? <p className="form-message error">{parseError}</p> : null}
        {payloadError ? <p className="form-message error">{payloadError}</p> : null}
        {kind ? (
          <div className="import-preview" aria-live="polite">
            <strong>Detected {detectedLabel.toLowerCase()} export</strong>
            <span>
              {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"} read from{" "}
              {unmappedColumns.length + columns.length > 0 ? "the file" : "the file"}.
              {rejected.length > 0 ? ` ${rejected.length} row needs attention.` : ""}
            </span>
            {unmappedColumns.length > 0 ? (
              <details className="rejected-rows">
                <summary>Review columns that were not imported</summary>
                <p className="form-message">
                  These columns were present in the file but are not part of this import:{" "}
                  {unmappedColumns.join(", ")}.
                </p>
              </details>
            ) : null}
            {rejected.length > 0 ? (
              <details className="rejected-rows">
                <summary>Review rows that need attention</summary>
                <ul>
                  {rejected.slice(0, 20).map((row) => (
                    <li key={`${row.rowNumber}-${row.message}`}>
                      Row {row.rowNumber}: {row.message}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <div className="inventory-table-wrap import-preview-table">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>File row</th>
                    {columns.map((column) => (
                      <th key={column.label}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row, index) => (
                    <tr key={index}>
                      <td>{(row.rowNumber as number | undefined) ?? index + 2}</td>
                      {columns.map((column) => (
                        <td key={column.label}>{column.get(row) ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <small>Showing the first {Math.min(rows.length, 8)} rows.</small>
          </div>
        ) : null}
        <button
          className="primary-button"
          type="submit"
          disabled={previewPending || !kind || Boolean(payloadError)}
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
            {displayedBatch.rowCount.toLocaleString()} source rows · {displayedBatch.kindLabel} ·{" "}
            {displayedBatch.acceptedCount.toLocaleString()} rows ready ·{" "}
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
                {approvalPending ? "Approving reviewed rows…" : "Approve and import"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      {approvalState.message ? (
        <p className={approvalState.error ? "form-message error" : "form-message"}>{approvalState.message}</p>
      ) : null}
    </section>
  );
}
