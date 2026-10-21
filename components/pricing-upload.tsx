"use client";

import { useState } from "react";
import { updateInventoryPricesFromCsv } from "../app/dashboard/pricing/actions";

type PriceUpdate = Readonly<{
  sourceSku: string;
  price: number | null;
  isActive: boolean;
}>;

type PricingUploadProps = Readonly<{
  organizationId: string;
}>;

export function PricingUpload({ organizationId }: PricingUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{ imported: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFile(file);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentFile = file;
    if (!currentFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const text = await currentFile.text();
      const lines = text.trim().split("\n");

      // Skip header row
      const rows = lines.slice(1);

      const updates: PriceUpdate[] = [];
      const parseErrors: string[] = [];

      for (const line of rows) {
        if (!line.trim()) continue;
        const cols = line.split(",");
        if (cols.length < 17) {
          parseErrors.push(`Row ${line}: not enough columns`);
          continue;
        }

        const sourceSku = (cols[0] ?? "").trim().replace(/"/g, "");
        const priceStr = (cols[16] ?? "").trim().replace(/"/g, "");

        let price: number | null = null;
        if (priceStr !== "") {
          const priceNum = Number(priceStr);
          if (!isFinite(priceNum)) {
            parseErrors.push(`SKU ${sourceSku}: invalid price "${priceStr}"`);
            continue;
          }
          price = priceNum;
        }

        updates.push({
          sourceSku,
          price,
          isActive: true,
        });
      }

      if (parseErrors.length > 0) {
        setUploadError(parseErrors.join("\n"));
        setIsUploading(false);
        return;
      }

      const result = await updateInventoryPricesFromCsv({ organizationId, updates });

      if (result.error) {
        setUploadError(result.error);
      } else {
        setUploadSuccess({
          imported: updates.length,
          errors: [],
        });
        setFile(null);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="pricing-upload-form">
      <h3>Upload Pricing CSV</h3>
      <p>
        Upload a CSV with columns: SKU, Manufacturer, Model, Variant, Network, Capacity, Color, Grade,
        Damages, ID, ESN, Location, Status, Battery Health, Marketplace Status, Local, Price
      </p>
      <input type="file" accept=".csv" onChange={handleFileChange} disabled={isUploading} />
      {file && <p>Selected: {file.name}</p>}
      <button type="submit" disabled={isUploading || !file}>
        {isUploading ? "Uploading…" : "Upload Prices"}
      </button>
      {uploadError && <p className="error">{uploadError}</p>}
      {uploadSuccess && <p className="success">Saved {uploadSuccess.imported} price(s).</p>}
    </form>
  );
}
