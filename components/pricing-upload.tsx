"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateInventoryPricesFromCsv } from "../app/dashboard/pricing/actions";
import { PRICING_CSV_INPUT_ID, parsePricingCsv } from "../lib/pricing-csv";

type PricingUploadProps = Readonly<{
  organizationId: string;
}>;

type UploadStatus = Readonly<{ kind: "error" | "success" | "warning"; text: string }>;

/**
 * The backend lambda applies bulk updates per SKU with several database
 * round trips and has a 15 second timeout, so send large files in batches.
 */
const SAVE_BATCH_SIZE = 100;

function formatErrors(errors: readonly string[]): string {
  const visible = errors.slice(0, 8).join("\n");
  return errors.length > 8 ? `${visible}\n…and ${errors.length - 8} more.` : visible;
}

export function PricingUpload({ organizationId }: PricingUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus | null>(null);

  const upload = async (file: File) => {
    setIsUploading(true);
    setProgress(null);
    setStatus(null);

    try {
      const text = await file.text();
      const { updates, errors } = parsePricingCsv(text);

      if (errors.length > 0) {
        setStatus({ kind: "error", text: formatErrors(errors) });
        return;
      }

      if (updates.length === 0) {
        setStatus({ kind: "error", text: "No rows with a SKU and price were found." });
        return;
      }

      let saved = 0;
      const saveErrors: string[] = [];

      for (let start = 0; start < updates.length; start += SAVE_BATCH_SIZE) {
        const batch = updates.slice(start, start + SAVE_BATCH_SIZE);
        const completed = Math.min(start + batch.length, updates.length);
        setProgress(`Saving ${completed} of ${updates.length} price(s)…`);

        const result = await updateInventoryPricesFromCsv({ organizationId, updates: batch });

        if ("error" in result) {
          if (saved > 0) router.refresh();
          setStatus({
            kind: "error",
            text: `Saved ${saved} price(s) before the upload failed. Please try again.`,
          });
          return;
        }

        saved += result.saved;
        saveErrors.push(...result.errors);
      }

      // Reload the table so the new prices show up without a manual refresh.
      if (saved > 0) router.refresh();

      if (saveErrors.length > 0) {
        const skipped = formatErrors(saveErrors);
        setStatus({
          kind: saved > 0 ? "warning" : "error",
          text:
            saved > 0
              ? `Saved ${saved} price(s). ${saveErrors.length} row(s) could not be updated:\n${skipped}`
              : `No prices were saved. ${saveErrors.length} row(s) could not be updated:\n${skipped}`,
        });
      } else {
        setStatus({ kind: "success", text: `Saved ${saved} price(s).` });
      }
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setIsUploading(false);
      setProgress(null);
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

  const statusText = isUploading ? (progress ?? "Uploading prices…") : (status?.text ?? null);

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
