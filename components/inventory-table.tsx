"use client";

import { useMemo, useState } from "react";

import {
  applyInventoryFilters,
  cascadingOptions,
  dependentOptions,
  emptyInventoryFilters,
  parseEsnList,
  productDetails,
  productFilterKeys,
  productTitle,
  rowDamages,
  rowGrade,
  type FunctionalityFilter,
  type InventoryFilters,
  type InventoryRow,
  type ProductFilterKey,
} from "../lib/inventory-filters";

const PAGE_SIZE = 100;

const productFilterLabels: Readonly<Record<ProductFilterKey, string>> = {
  manufacturer: "Manufacturer",
  model: "Model",
  variant: "Variant",
  network: "Network",
  capacity: "Capacity",
  color: "Color",
};

type InventoryTableProps = Readonly<{
  rows: InventoryRow[];
}>;

export function InventoryTable({ rows }: InventoryTableProps) {
  const [filters, setFilters] = useState<InventoryFilters>(emptyInventoryFilters);
  const [esnText, setEsnText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const esnList = useMemo(() => parseEsnList(esnText), [esnText]);

  const filteredRows = useMemo(
    () => applyInventoryFilters(rows, filters, esnList, search),
    [esnList, filters, rows, search],
  );

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const optionSets = useMemo(
    () => ({
      manufacturer: cascadingOptions(rows, "manufacturer", filters),
      model: cascadingOptions(rows, "model", filters),
      variant: cascadingOptions(rows, "variant", filters),
      network: cascadingOptions(rows, "network", filters),
      capacity: cascadingOptions(rows, "capacity", filters),
      color: cascadingOptions(rows, "color", filters),
      grade: dependentOptions(rows, "grade", filters),
      status: dependentOptions(rows, "status", filters),
      location: dependentOptions(rows, "location", filters),
    }),
    [filters, rows],
  );

  const activeFilterCount = useMemo(() => {
    let count = productFilterKeys.filter((key) => filters[key]).length;
    if (filters.functionality !== "any") count += 1;
    if (filters.grade) count += 1;
    if (filters.status) count += 1;
    if (filters.location) count += 1;
    if (esnList.length > 0) count += 1;
    if (search.trim()) count += 1;
    return count;
  }, [esnList.length, filters, search]);

  function updateFilter<Key extends keyof InventoryFilters>(key: Key, value: InventoryFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function updateProductFilter(key: ProductFilterKey, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value } as Record<ProductFilterKey, string>;
      // Clear product selections that are no longer offered, so the panel never
      // holds a value that cannot match any row.
      for (const otherKey of productFilterKeys) {
        if (otherKey === key) continue;
        if (next[otherKey] && !cascadingOptions(rows, otherKey, next).includes(next[otherKey])) {
          next[otherKey] = "";
        }
      }
      return { ...current, ...next };
    });
    setPage(1);
  }

  function resetFilters() {
    setFilters(emptyInventoryFilters);
    setEsnText("");
    setSearch("");
    setPage(1);
  }

  function toggleRow(rowId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }

  function toggleVisibleRows(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const row of visibleRows) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  function downloadCsv() {
    const header = ["PO", "Product", "SKU", "ESN", "Grade", "Damages", "Status", "Location", "ID"];
    const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const lines = [
      header.map(escapeCell).join(","),
      ...filteredRows.map((row) =>
        [
          "",
          productTitle(row),
          row.sourceSku,
          row.serialNumber ?? "",
          rowGrade(row),
          rowDamages(row),
          row.status ?? "",
          row.location ?? "",
          row.id,
        ]
          .map(escapeCell)
          .join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.id));

  return (
    <>
      <div className="inventory-filter-panel">
        <section className="inventory-filter-column" aria-labelledby="inventory-filter-product">
          <h2 className="inventory-filter-title" id="inventory-filter-product">
            Product
          </h2>
          <div className="inventory-filter-stack">
            {productFilterKeys.map((key) => (
              <label className="inventory-filter-field" key={key}>
                <span className="sr-only">{productFilterLabels[key]}</span>
                <select
                  aria-label={productFilterLabels[key]}
                  onChange={(event) => updateProductFilter(key, event.target.value)}
                  value={filters[key]}
                >
                  <option value="">{productFilterLabels[key]}</option>
                  {optionSets[key].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section className="inventory-filter-column" aria-labelledby="inventory-filter-functionality">
          <h2 className="inventory-filter-title" id="inventory-filter-functionality">
            Functionality
          </h2>
          <div className="inventory-filter-radio-group">
            {(
              [
                ["any", "Any"],
                ["functional", "Functional"],
                ["damaged", "Damaged"],
              ] as ReadonlyArray<readonly [FunctionalityFilter, string]>
            ).map(([value, label]) => (
              <label className="inventory-filter-radio" key={value}>
                <input
                  checked={filters.functionality === value}
                  name="functionality"
                  onChange={() => updateFilter("functionality", value)}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="inventory-filter-column" aria-labelledby="inventory-filter-grade">
          <h2 className="inventory-filter-title" id="inventory-filter-grade">
            Grade
          </h2>
          <div className="inventory-filter-stack">
            <label className="inventory-filter-field">
              <span className="sr-only">Grade</span>
              <select
                aria-label="Grade"
                onChange={(event) => updateFilter("grade", event.target.value)}
                value={filters.grade}
              >
                <option value="">Select option</option>
                {optionSets.grade.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="inventory-esn-toggle" role="group" aria-label="Identifier type">
              <button className="inventory-esn-tab active" type="button">
                ESNs
              </button>
              <button
                className="inventory-esn-tab"
                type="button"
                disabled
                title="Hex ID lookup is not connected yet."
              >
                Hex ID
              </button>
            </div>
            <label className="inventory-filter-field">
              <span className="sr-only">ESN list</span>
              <textarea
                aria-label="ESN list"
                className="inventory-esn-textarea"
                onChange={(event) => {
                  setEsnText(event.target.value);
                  setPage(1);
                }}
                placeholder={"ESN1\nESN2\nESN3\n..."}
                rows={4}
                value={esnText}
              />
            </label>
          </div>
        </section>

        <section className="inventory-filter-column" aria-labelledby="inventory-filter-status">
          <h2 className="inventory-filter-title" id="inventory-filter-status">
            Status
          </h2>
          <label className="inventory-filter-field">
            <span className="sr-only">Status</span>
            <select
              aria-label="Status"
              onChange={(event) => updateFilter("status", event.target.value)}
              value={filters.status}
            >
              <option value="">Select option</option>
              {optionSets.status.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="inventory-filter-column" aria-labelledby="inventory-filter-location">
          <h2 className="inventory-filter-title" id="inventory-filter-location">
            Locations
          </h2>
          <label className="inventory-filter-field">
            <span className="sr-only">Location</span>
            <select
              aria-label="Location"
              onChange={(event) => updateFilter("location", event.target.value)}
              value={filters.location}
            >
              <option value="">All Locations</option>
              {optionSets.location.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="inventory-filter-column" aria-labelledby="inventory-filter-pending">
          <h2 className="inventory-filter-title" id="inventory-filter-pending">
            Not connected yet
          </h2>
          <p className="inventory-filter-note">
            These WholeCell filters need inventory fields the backend does not store yet. They stay disabled
            until the data is available.
          </p>
          <label className="inventory-filter-field">
            <span className="inventory-filter-field-label">Last Status Change</span>
            <input disabled placeholder="Before / After" type="text" />
          </label>
          <label className="inventory-filter-field">
            <span className="inventory-filter-field-label">Inventory Date</span>
            <input disabled placeholder="All time" type="text" />
          </label>
          <label className="inventory-filter-field">
            <span className="inventory-filter-field-label">Custom Field Search</span>
            <input disabled placeholder="Not available" type="text" />
          </label>
          <label className="inventory-filter-field">
            <span className="inventory-filter-field-label">Battery Health</span>
            <input disabled placeholder="Min / Max" type="text" />
          </label>
        </section>
      </div>

      <div className="inventory-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-dropdown">
            Bulk Actions <span className="dropdown-arrow">▾</span>
          </span>
          <button className="toolbar-btn" type="button">
            Stock Levels
          </button>
          <button className="toolbar-btn" type="button">
            Grouped
          </button>
          <button className="toolbar-btn active" type="button">
            Individual
          </button>
          <button
            className="toolbar-btn"
            type="button"
            disabled
            title="Column preferences are not connected yet."
          >
            Columns
          </button>
          <button className="toolbar-btn download-btn" onClick={downloadCsv} type="button">
            Download <span className="download-icon">⤓</span>
          </button>
        </div>
        <div className="toolbar-group">
          <label className="catalog-search inventory-toolbar-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search inventory"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
              type="search"
              value={search}
            />
          </label>
          {activeFilterCount > 0 ? (
            <button className="toolbar-btn" onClick={resetFilters} type="button">
              Clear filters ({activeFilterCount})
            </button>
          ) : null}
        </div>
      </div>

      <div className="inventory-table-wrap">
        <table className="catalog-table inventory-table">
          <caption className="sr-only">Inventory items</caption>
          <thead>
            <tr>
              <th className="catalog-checkbox-column">
                <input
                  aria-label="Select visible rows"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleVisibleRows(event.target.checked)}
                  type="checkbox"
                />
              </th>
              <th>PO</th>
              <th>Product</th>
              <th>ID</th>
              <th>ESN</th>
              <th>Grade</th>
              <th>Damages</th>
              <th>Status</th>
              <th>Location</th>
              <th>Sold</th>
              <th>Order</th>
              <th>Battery Health</th>
              <th>Marketplace Status</th>
              <th>Local</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>
                <td className="catalog-checkbox-column">
                  <input
                    aria-label={`Select ${row.serialNumber ?? row.id}`}
                    checked={selectedIds.has(row.id)}
                    onChange={(event) => toggleRow(row.id, event.target.checked)}
                    type="checkbox"
                  />
                </td>
                <td className="inventory-td-po">—</td>
                <td className="inventory-td-product">
                  <strong>{productTitle(row)}</strong>
                  <small>{productDetails(row)}</small>
                  <em>SKU: {row.sourceSku}</em>
                </td>
                <td className="inventory-td-id">—</td>
                <td className="inventory-td-esn">{row.serialNumber ?? "—"}</td>
                <td>{rowGrade(row) || "—"}</td>
                <td>{rowDamages(row) || "—"}</td>
                <td>{row.status ?? "—"}</td>
                <td>{row.location ?? "—"}</td>
                <td>$0.00</td>
                <td>N/A</td>
                <td className="inventory-td-muted">—</td>
                <td className="inventory-td-muted">—</td>
                <td className="inventory-td-muted">—</td>
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td className="catalog-empty-row" colSpan={14}>
                  No inventory items match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <nav className="catalog-pagination" aria-label="Inventory pages">
        <span>
          Showing {filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length.toLocaleString()}
        </span>
        <div>
          <button
            className="catalog-page-button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {page} of {pageCount}
          </span>
          <button
            className="catalog-page-button"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </nav>
    </>
  );
}
