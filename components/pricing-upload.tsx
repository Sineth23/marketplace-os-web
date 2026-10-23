"use client";

import { useRef, useState } from "react";
import { updateInventoryPricesFromCsv } from "../app/dashboard/pricing/actions";
import { PRICING_CSV_INPUT_ID, parsePricingCsv } from "../lib/pricing-csv";

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
      const { updates, errors } = parsePricingCsv(text);

      if (errors.length > 0) {
        setStatus({ kind: "error", text: errors.join("\n") });
        return;
      }

      if (updates.length === 0) {
        setStatus({ kind: "error", text: "No rows with a SKU and price were found." });
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
