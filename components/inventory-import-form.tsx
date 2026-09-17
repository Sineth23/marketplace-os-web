"use client";

import { useActionState } from "react";

import { importInventoryAction } from "../app/dashboard/actions";

type InventoryImportFormProps = Readonly<{ organizationId: string }>;

const initialInventoryImportState = {
  message: "",
  error: false,
  rejected: [] as readonly Readonly<{ rowNumber: number; message: string }>[],
};

export function InventoryImportForm({ organizationId }: InventoryImportFormProps) {
  const [state, action, pending] = useActionState(importInventoryAction, initialInventoryImportState);

  return (
    <form className="inventory-import-form" action={action}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <label className="file-picker" htmlFor="inventory-file">
        <span className="file-picker-icon" aria-hidden="true">
          ↑
        </span>
        <span>
          <strong>Choose a WholeCell inventory CSV</strong>
          <small>
            We use SKU and catalog columns only. Serial numbers and operational fields are ignored.
          </small>
        </span>
        <input id="inventory-file" name="file" type="file" accept=".csv,text/csv" required />
      </label>
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Checking inventory…" : "Review and import"}
      </button>
      {state.message ? (
        <p className={state.error ? "form-message error" : "form-message"}>{state.message}</p>
      ) : null}
      {state.rejected.length > 0 ? (
        <details className="rejected-rows">
          <summary>
            {state.rejected.length} row{state.rejected.length === 1 ? "" : "s"} need attention
          </summary>
          <ul>
            {state.rejected.slice(0, 20).map((row) => (
              <li key={`${row.rowNumber}-${row.message}`}>
                Row {row.rowNumber}: {row.message}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </form>
  );
}
