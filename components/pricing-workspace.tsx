"use client";

import { useCallback, useRef, useState } from "react";

import {
  PricingTable,
  type PricingRow,
  type PricingSaveState,
  type PricingTableHandle,
} from "./pricing-table";
import { PricingToolbar } from "./pricing-toolbar";

export type PricingExportRow = Readonly<{
  sourceSku: string;
  manufacturer: string;
  model: string;
  variant: string;
  network: string;
  capacity: string;
  color: string;
  grade: string;
  damages: string;
  skuId: string;
  price: number | null;
}>;

type PricingWorkspaceProps = Readonly<{
  /** The rows shown on the current page. */
  pageRows: PricingRow[];
  /** Every row in the active filtered result set, used for saving and export. */
  resultRows: PricingRow[];
  /** The result rows with their saved price attached, for the CSV export. */
  exportRows: readonly PricingExportRow[];
  organizationId: string;
  canExport: boolean;
  isFiltered: boolean;
}>;

/**
 * Owns the pricing action bar and the pricing table so the Save button can
 * live in the top bar while still saving every row in the filtered result
 * set.
 */
export function PricingWorkspace({
  pageRows,
  resultRows,
  exportRows,
  organizationId,
  canExport,
  isFiltered,
}: PricingWorkspaceProps) {
  const [saveState, setSaveState] = useState<PricingSaveState>({
    isSaving: false,
    message: null,
    error: null,
  });
  const tableRef = useRef<PricingTableHandle | null>(null);

  const handleSaveStateChange = useCallback((state: PricingSaveState) => {
    setSaveState(state);
  }, []);

  return (
    <>
      <div className="pricing-actions pricing-actions-toolbar">
        <PricingToolbar
          rows={exportRows}
          canExport={canExport}
          isFiltered={isFiltered}
          isSaving={saveState.isSaving}
          saveMessage={saveState.message}
          saveError={saveState.error}
          onSave={() => tableRef.current?.save()}
        />
      </div>

      <PricingTable
        ref={tableRef}
        rows={pageRows}
        saveTargets={resultRows}
        organizationId={organizationId}
        isFiltered={isFiltered}
        onSaveStateChange={handleSaveStateChange}
      />
    </>
  );
}
