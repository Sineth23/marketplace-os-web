"use client";

import { useActionState, useState } from "react";

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

/** The number of rows shown per page in the review table. */
const PAGE_LENGTH = 50;

function formatQuantity(value: number | null): string {
  if (value === null) return "Not reported";
  return value.toLocaleString();
}

function catalogLabel(record: { sourceSku: string; grade: string | null; damages: string | null }): string {
  return [record.sourceSku, record.grade, record.damages].filter(Boolean).join(" Â· ");
}

function MappingForm({
  row,
  organizationId,
  catalogSkus,
  action,
}: {
  row: MappingRow;
  organizationId: string;
  catalogSkus: readonly {
    id: string;
    sourceSku: string;
    grade: string | null;
    damages: string | null;
  }[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const listing = row.listing;
  // The suggestion names a catalogue sku, and the picker is keyed by catalogue id,
  // so the suggestion is resolved back to an id before it is preselected.
  const suggestionSku = row.candidates[0]?.record.sku;
  const suggestion = suggestionSku ? catalogSkus.find((sku) => sku.sourceSku === suggestionSku) : undefined;
  return (
    <form action={action} className="listing-mapping-form">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="provider" value={listing.provider} />
      <input type="hidden" name="providerSku" value={listing.providerSku ?? ""} />
      <input type="hidden" name="inventorySkuId" value={row.catalogSku ?? suggestion?.id ?? ""} readOnly />
      {/*
        The catalogue is large, so the picker is a filterable text field backed by
        one shared list of catalogue labels rather than a select with one option
        per record. A select for every row would put hundreds of thousands of
        options in the document.
      */}
      <input
        className="listing-mapping-picker"
        type="text"
        list="catalog-options"
        defaultValue={suggestion ? catalogLabel(suggestion) : ""}
        placeholder="Search the catalogue"
        aria-label={`Catalogue record for ${listing.providerSku ?? listing.title}`}
        onChange={(event) => {
          const match = catalogSkus.find((sku) => catalogLabel(sku) === event.target.value);
          const field = event.target.form?.elements.namedItem("inventorySkuId");
          if (field instanceof HTMLInputElement) field.value = match?.id ?? "";
        }}
      />
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
  catalogSkus: readonly {
    id: string;
    sourceSku: string;
    grade: string | null;
    damages: string | null;
  }[];
  stateFilter: string;
}) {
  const [state, action] = useActionState(saveProviderMappingAction, initialState);
  const visible = rows.filter((row) => !stateFilter || row.state === stateFilter);
  // The catalogue is large and the listings can number in the hundreds, so the
  // table shows one page at a time rather than every row in the document.
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_LENGTH));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_LENGTH, currentPage * PAGE_LENGTH);

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
            {pageRows.map((row) => {
              const listing: ListingRow = row.listing;
              return (
                <tr key={`${listing.provider}:${listing.key}`}>
                  <td>{providerLabels[listing.provider]}</td>
                  <td>{listing.providerSku ?? "â€”"}</td>
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
      {/*
        One shared list of catalogue labels backs every row's picker, so the
        catalogue appears in the document once rather than once per row.
      */}
      <datalist id="catalog-options">
        {catalogSkus.map((sku) => (
          <option key={sku.id} value={catalogLabel(sku)} />
        ))}
      </datalist>
      <nav className="operations-pagination" aria-label="Mapping review pages">
        <span>
          Showing {(pageRows.length ? (currentPage - 1) * PAGE_LENGTH + 1 : 0).toLocaleString()}–
          {Math.min(currentPage * PAGE_LENGTH, visible.length).toLocaleString()} of{" "}
          {visible.length.toLocaleString()}
        </span>
        {currentPage > 1 ? (
          <button className="quiet-button" type="button" onClick={() => setPage(currentPage - 1)}>
            Previous
          </button>
        ) : null}
        <span>
          Page {currentPage} of {pageCount}
        </span>
        {currentPage < pageCount ? (
          <button className="quiet-button" type="button" onClick={() => setPage(currentPage + 1)}>
            Next
          </button>
        ) : null}
      </nav>
      <p className="listing-summary-line">
        A suggestion is a convenience, not a decision; the mapping is only made when it is chosen.
      </p>
    </>
  );
}
