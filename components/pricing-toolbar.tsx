"use client";

import Link from "next/link";
import { useState } from "react";

import { PRICING_CSV_INPUT_ID, serializePricingCsv, type PricingCsvRow } from "../lib/pricing-csv";

type PricingToolbarProps = {
  rows: readonly PricingCsvRow[];
  canExport: boolean;
  /** True when the export covers only the filtered result set. */
  isFiltered: boolean;
  /** Saves every price in the filtered result set. */
  onSave?: (() => void) | undefined;
  isSaving?: boolean;
  saveMessage?: string | null;
  saveError?: string | null;
};

export function PricingToolbar({
  rows,
  canExport,
  isFiltered,
  onSave,
  isSaving = false,
  saveMessage = null,
  saveError = null,
}: PricingToolbarProps) {
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleUploadClick = () => {
    document.getElementById(PRICING_CSV_INPUT_ID)?.click();
  };

  const handleDownloadClick = () => {
    setDownloadError(null);
    try {
      const csv = serializePricingCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pricing-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not build the spreadsheet. Please try again.");
    }
  };

  const exportLabel = isFiltered
    ? `Download filtered spreadsheet (${rows.length.toLocaleString()})`
    : `Download spreadsheet (${rows.length.toLocaleString()})`;

  return (
    <>
      <Link className="primary-link" href="/dashboard/pricing/bulk">
        Bulk Pricing
      </Link>
      <button className="quiet-button" type="button" onClick={handleUploadClick}>
        Upload Spreadsheet
      </button>
      <button
        className="quiet-button"
        type="button"
        onClick={handleDownloadClick}
        disabled={!canExport || rows.length === 0}
        title={canExport ? undefined : "Current prices could not be loaded, so exporting is disabled."}
      >
        {exportLabel}
      </button>
      {onSave ? (
        <button
          className="primary-button pricing-save-button"
          type="button"
          onClick={onSave}
          disabled={isSaving || rows.length === 0}
        >
          {isSaving ? "Saving…" : "Save prices"}
        </button>
      ) : null}
      {saveMessage ? (
        <span className="pricing-save-status success" role="status">
          {saveMessage}
        </span>
      ) : null}
      {saveError ? (
        <span className="pricing-save-status error" role="alert">
          {saveError}
        </span>
      ) : null}
      {downloadError ? (
        <span className="pricing-save-status error" role="alert">
          {downloadError}
        </span>
      ) : null}
    </>
  );
}
