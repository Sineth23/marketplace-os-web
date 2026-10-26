"use client";

import { useActionState } from "react";

import { saveProviderMappingAction, type ProviderMappingActionState } from "../app/dashboard/actions";
import { providerLabels, type ListingRow } from "../lib/listing-rows";
import type { MappingRow } from "../lib/listing-mapping";

/**
 * The mapping review screen.
 *
 * A provider's sku and the tenant's catalog sku are different vocabularies, so
 * a listing only becomes comparable once a mapping links them. This screen
 * offers the unmapped listings for review, shows the ones already linked so a
 * wrong mapping can be corrected, and shows the ones deliberately rejected.
 *
 * A suggestion is a convenience, not a decision. The operator chooses.
 */

const initialState: ProviderMappingActionState = { message: "", error: false };

function formatQuantity(value: number | null): string {
  if (value === null) return "Not reported";
  return value.toLocaleString();
}

function MappingForm({
  row,
  organizationId,
  catalogSkus,
  action,
}: {
  row: MappingRow;
  organizationId: string;
  catalogSkus: readonly { id: string; sourceSku: string }[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const listing = row.listing;
  return (
    <form action={action} className="listing-mapping-form">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="provider" value={listing.provider} />
      <input type="hidden" name="providerSku" value={listing.providerSku ?? ""} />
      <select
        name="inventorySkuId"
        defaultValue={row.catalogSku ?? ""}
        aria-label={`Catalogue sku for ${listing.providerSku ?? listing.title}`}
      >
        <option value="">Not in the catalogue</option>
        {catalogSkus.map((sku) => (
          <option key={sku.id} value={sku.id}>
            {sku.sourceSku}
          </option>
        ))}
      </select>
      <button name="state" type="submit" value="linked">
        {row.state === "linked" ? "Update" : "Map"}
      </button>
      {row.state !== "rejected" ? (
        <button className="quiet-button" name="state" type="submit" value="rejected">
          Not in catalogue
        </button>
      ) : null}
    </form>
  );
}

export function ListingMappingReview({
  organizationId,
  rows,
  catalogSkus,
  stateFilter,
}: {
  organizationId: string;
  rows: readonly MappingRow[];
  catalogSkus: readonly { id: string; sourceSku: string }[];
  stateFilter: string;
}) {
  const [state, action] = useActionState(saveProviderMappingAction, initialState);
  const visible = rows.filter((row) => !stateFilter || row.state === stateFilter);

  return (
    <>
      {state.message ? (
        <p className={state.error ? "form-message error" : "form-message"} role="status">
          {state.message}
        </p>
      ) : null}

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <caption className="sr-only">
            Marketplace listings reviewed against the tenant&apos;s catalogue
          </caption>
          <thead>
            <tr>
              <th scope="col">Marketplace</th>
              <th scope="col">Provider SKU</th>
              <th scope="col">Product</th>
              <th scope="col">Provider qty</th>
              <th scope="col">Mapping</th>
              <th scope="col">Suggestions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const listing: ListingRow = row.listing;
              return (
                <tr key={`${listing.provider}:${listing.key}`}>
                  <td>{providerLabels[listing.provider]}</td>
                  <td>{listing.providerSku ?? "—"}</td>
                  <td>
                    <span className="listing-title">{listing.title}</span>
                  </td>
                  <td>{formatQuantity(listing.quantity)}</td>
                  <td>
                    {row.state === "linked" ? (
                      <span className="listing-comparison match">Linked</span>
                    ) : row.state === "rejected" ? (
                      <span className="listing-comparison unlinked">Not in catalogue</span>
                    ) : (
                      <span className="listing-comparison unknown">Unlinked</span>
                    )}
                  </td>
                  <td>
                    <MappingForm
                      row={row}
                      organizationId={organizationId}
                      catalogSkus={catalogSkus}
                      action={action}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="listing-summary-line">
        Showing {visible.length.toLocaleString()} of {rows.length.toLocaleString()} listings. A suggestion is
        a convenience, not a decision; the mapping is only made when it is chosen.
      </p>
    </>
  );
}
