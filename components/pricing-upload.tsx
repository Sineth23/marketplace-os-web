"use client";

import { useRef, useState } from "react";
import { updateInventoryPricesFromCsv } from "../app/dashboard/pricing/actions";
import { PRICING_CSV_INPUT_ID } from "../lib/pricing-csv";

type PriceUpdate = Readonly<{
  sourceSku: string;
  price: number | null;
  isActive: boolean;
}>;

type PricingUploadProps = Readonly<{
  organizationId: string;
}>;

export function PricingUpload({ organizationId }: PricingUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const upload = async (file: File) => {
    setIsUploading(true);
    setStatus(null);

    try {
      const text = await file.text();
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
        setStatus({ kind: "error", text: parseErrors.join("\n") });
        return;
      }

      const result = await updateInventoryPricesFromCsv({ organizationId, updates });

      if (result.error) {
        setStatus({ kind: "error", text: result.error });
      } else {
        setStatus({ kind: "success", text: `Imported ${updates.length} price(s).` });
      }
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void upload(file);
    }
  };

  const statusText = isUploading ? "Uploading prices…" : (status?.text ?? null);

  return (
    <>
      <input
        ref={inputRef}
        id={PRICING_CSV_INPUT_ID}
        className="sr-only"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={isUploading}
        aria-label="Upload pricing CSV"
      />
      {statusText ? (
        <p
          className={`pricing-upload-status${status && !isUploading ? ` ${status.kind}` : ""}`}
          role="status"
        >
          {statusText}
        </p>
      ) : null}
    </>
  );
}
