"use client";

import Link from "next/link";

import { PRICING_CSV_INPUT_ID, serializePricingCsv, type PricingCsvRow } from "../lib/pricing-csv";

type PricingToolbarProps = {
  rows: readonly PricingCsvRow[];
  canExport: boolean;
};

export function PricingToolbar({ rows, canExport }: PricingToolbarProps) {
  const handleUploadClick = () => {
    document.getElementById(PRICING_CSV_INPUT_ID)?.click();
  };

  const handleDownloadClick = () => {
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
  };

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
        Download Spreadsheet
      </button>
    </>
  );
}
