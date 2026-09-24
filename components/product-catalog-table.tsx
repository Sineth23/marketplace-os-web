"use client";

import { useMemo, useState } from "react";

import { parseProductCatalogCsv, type ProductVariation } from "../lib/product-catalog-csv";

type CatalogSection =
  | "variations"
  | "products"
  | "manufacturers"
  | "models"
  | "variants"
  | "networks"
  | "colors"
  | "capacities"
  | "grades"
  | "damage-conditions";

type Props = Readonly<{
  initialVariations: readonly ProductVariation[];
  canViewSnapshot: boolean;
}>;

type CatalogSummary = Readonly<{ name: string; count: number; sampleSku: string }>;
type ProductFilters = Readonly<{
  manufacturer: string;
  model: string;
  variant: string;
  network: string;
  capacity: string;
  color: string;
  grade: string;
  damage: string;
}>;

const PAGE_SIZE = 50;
const emptyFilters: ProductFilters = {
  manufacturer: "",
  model: "",
  variant: "",
  network: "",
  capacity: "",
  color: "",
  grade: "",
  damage: "",
};

const sectionTitles: Record<CatalogSection, string> = {
  variations: "All Product Variations",
  products: "All Products",
  manufacturers: "All Manufacturers",
  models: "All Models",
  variants: "All Variants",
  networks: "All Networks",
  colors: "All Colors",
  capacities: "All Capacities",
  grades: "All Grades",
  "damage-conditions": "All Damage Conditions",
};

function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
}

function productName(row: ProductVariation): string {
  return [row.manufacturer, row.model].filter(Boolean).join(" ") || "Product details unavailable";
}

function productDetails(row: ProductVariation): string {
  return [row.variant, row.network, row.capacity, row.color].filter(Boolean).join(" | ");
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadRows(rows: readonly ProductVariation[], fileName: string): void {
  const headers = [
    "ID",
    "SKU",
    "Manufacturer",
    "Model",
    "Variant",
    "Network",
    "Capacity",
    "Color",
    "Grade",
    "Damages",
    "Weight",
    "Weight Unit",
  ];
  const keys: readonly (keyof ProductVariation)[] = [
    "id",
    "sku",
    "manufacturer",
    "model",
    "variant",
    "network",
    "capacity",
    "color",
    "grade",
    "damages",
    "weight",
    "weightUnit",
  ];
  const text = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function summarize(variations: readonly ProductVariation[], key: keyof ProductVariation): CatalogSummary[] {
  const groups = new Map<string, ProductVariation[]>();
  for (const row of variations) {
    const name = row[key].trim();
    if (!name) continue;
    const group = groups.get(name) ?? [];
    group.push(row);
    groups.set(name, group);
  }
  return [...groups.entries()]
    .map(([name, rows]) => ({ name, count: rows.length, sampleSku: rows.find((row) => row.sku)?.sku ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

function summaryRows(variations: readonly ProductVariation[], section: CatalogSection): CatalogSummary[] {
  if (section === "products") {
    const groups = new Map<string, ProductVariation[]>();
    for (const row of variations) {
      const name = productName(row);
      const group = groups.get(name) ?? [];
      group.push(row);
      groups.set(name, group);
    }
    return [...groups.entries()]
      .map(([name, rows]) => ({
        name,
        count: rows.length,
        sampleSku: rows.find((row) => row.sku)?.sku ?? "—",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  }

  const field: keyof ProductVariation =
    section === "manufacturers"
      ? "manufacturer"
      : section === "models"
        ? "model"
        : section === "variants"
          ? "variant"
          : section === "networks"
            ? "network"
            : section === "colors"
              ? "color"
              : section === "capacities"
                ? "capacity"
                : section === "grades"
                  ? "grade"
                  : "damages";
  return summarize(variations, field);
}

export function ProductCatalogTable({ initialVariations, canViewSnapshot }: Props) {
  const [variations, setVariations] = useState(initialVariations);
  const [sourceName, setSourceName] = useState("WholeCell product export");
  const [section, setSection] = useState<CatalogSection>("variations");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation>();
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const filteredVariations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return variations.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.id,
          row.sku,
          row.manufacturer,
          row.model,
          row.variant,
          row.network,
          row.capacity,
          row.color,
          row.grade,
          row.damages,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (!filters.manufacturer || row.manufacturer === filters.manufacturer) &&
        (!filters.model || row.model === filters.model) &&
        (!filters.variant || row.variant === filters.variant) &&
        (!filters.network || row.network === filters.network) &&
        (!filters.capacity || row.capacity === filters.capacity) &&
        (!filters.color || row.color === filters.color) &&
        (!filters.grade || row.grade === filters.grade) &&
        (!filters.damage || row.damages === filters.damage)
      );
    });
  }, [filters, query, variations]);

  const summaries = useMemo(() => summaryRows(variations, section), [section, variations]);
  const matchingSummaries = summaries.filter(
    (row) =>
      !query.trim() || `${row.name} ${row.sampleSku}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const resultCount = section === "variations" ? filteredVariations.length : matchingSummaries.length;
  const pageCount = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));
  const visibleRows = filteredVariations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleSummaries = matchingSummaries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filterOptions: Readonly<Record<keyof ProductFilters, string[]>> = useMemo(
    () => ({
      manufacturer: uniqueValues(variations.map((row) => row.manufacturer)),
      model: uniqueValues(variations.map((row) => row.model)),
      variant: uniqueValues(variations.map((row) => row.variant)),
      network: uniqueValues(variations.map((row) => row.network)),
      capacity: uniqueValues(variations.map((row) => row.capacity)),
      color: uniqueValues(variations.map((row) => row.color)),
      grade: uniqueValues(variations.map((row) => row.grade)),
      damage: uniqueValues(variations.map((row) => row.damages)),
    }),
    [variations],
  );

  function changeSection(nextSection: CatalogSection) {
    setSection(nextSection);
    setPage(1);
  }

  function selectPage(checked: boolean) {
    const next = new Set(selectedIds);
    for (const row of visibleRows) {
      if (checked) next.add(row.id);
      else next.delete(row.id);
    }
    setSelectedIds(next);
  }

  async function loadUploadedCsv(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setUploadMessage("");
    try {
      const loadedRows = parseProductCatalogCsv(await file.text());
      setVariations(loadedRows);
      setSourceName(file.name);
      setSelectedIds(new Set());
      setPage(1);
      setUploadMessage(`${loadedRows.length.toLocaleString()} rows loaded for this browser session.`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to read this CSV.");
    }
  }

  const navButton = (key: CatalogSection, label: string, icon?: string) => (
    <button
      aria-current={section === key ? "page" : undefined}
      className={`catalog-subnav-link ${section === key ? "selected" : ""}`}
      key={key}
      onClick={() => changeSection(key)}
      type="button"
    >
      {icon ? (
        <span className="catalog-subnav-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {label}
      {key === "variations" ? (
        <span className="catalog-subnav-count">{variations.length.toLocaleString()}</span>
      ) : null}
    </button>
  );

  return (
    <section className="product-catalog-page">
      <header className="catalog-page-heading">
        <div>
          <p className="eyebrow">WholeCell catalog</p>
          <h1>Device Mart Products</h1>
        </div>
        <span className="catalog-source-count">{variations.length.toLocaleString()} variations</span>
      </header>

      {canViewSnapshot ? (
        <div className="product-catalog-layout">
          <nav aria-label="Product catalog sections" className="catalog-subnav">
            {navButton("variations", "Product Variations", "▣")}
            <div className="catalog-nav-divider" />
            <p className="catalog-nav-group">Products</p>
            {navButton("products", "Products")}
            {navButton("manufacturers", "Manufacturers")}
            {navButton("models", "Models")}
            {navButton("variants", "Variants")}
            {navButton("networks", "Networks")}
            {navButton("colors", "Colors")}
            {navButton("capacities", "Capacities")}
            <div className="catalog-nav-divider" />
            {navButton("grades", "Grades", "☆")}
            {navButton("damage-conditions", "Damage Conditions", "♦")}
          </nav>

          <div className="catalog-main-panel">
            <div className="catalog-main-heading">
              <h2>{sectionTitles[section]}</h2>
              <div className="catalog-actions">
                <button
                  className="catalog-action-button catalog-primary-action"
                  disabled
                  title="Editing is not connected to the catalog service yet."
                  type="button"
                >
                  + New
                </button>
                <label className="catalog-action-button catalog-primary-action catalog-upload-action">
                  <span aria-hidden="true">↥</span> Upload
                  <input
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      void loadUploadedCsv(file);
                    }}
                    type="file"
                  />
                </label>
                <button
                  className={`catalog-action-button ${filtersOpen ? "catalog-action-active" : ""}`}
                  onClick={() => setFiltersOpen((open) => !open)}
                  type="button"
                >
                  ▽ Filters
                </button>
                <button
                  className="catalog-action-button"
                  onClick={() =>
                    downloadRows(
                      section === "variations" ? filteredVariations : variations,
                      "wholecell-product-variations.csv",
                    )
                  }
                  type="button"
                >
                  ↓ Download
                </button>
                <button
                  className="catalog-action-button catalog-delete-action"
                  disabled
                  title="Destructive catalog actions are not available in this read-only view."
                  type="button"
                >
                  Delete Unused Product Variations
                </button>
              </div>
            </div>

            <div className="catalog-table-tools">
              <label className="catalog-bulk-actions">
                <span>⚙</span>
                <select
                  aria-label="Bulk actions"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.currentTarget.value === "download" && selectedIds.size) {
                      downloadRows(
                        variations.filter((row) => selectedIds.has(row.id)),
                        "selected-product-variations.csv",
                      );
                    }
                    event.currentTarget.value = "";
                  }}
                >
                  <option value="">Bulk Actions</option>
                  <option disabled={!selectedIds.size} value="download">
                    Download selected
                  </option>
                </select>
              </label>
              <label className="catalog-search">
                <span aria-hidden="true">⌕</span>
                <input
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search"
                  type="search"
                  value={query}
                />
              </label>
            </div>

            {filtersOpen && section === "variations" ? (
              <div className="catalog-filter-panel">
                {(Object.entries(filterOptions) as [keyof ProductFilters, string[]][]).map(
                  ([key, options]) => (
                    <label key={key}>
                      {key === "damage" ? "Conditions" : key.charAt(0).toUpperCase() + key.slice(1)}
                      <select
                        onChange={(event) => {
                          setFilters((current) => ({ ...current, [key]: event.target.value }));
                          setPage(1);
                        }}
                        value={filters[key]}
                      >
                        <option value="">All</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
                <button
                  className="catalog-clear-filter"
                  onClick={() => {
                    setFilters(emptyFilters);
                    setPage(1);
                  }}
                  type="button"
                >
                  Clear filters
                </button>
              </div>
            ) : null}

            {uploadMessage || uploadError ? (
              <p
                className={`catalog-upload-message ${uploadError ? "error" : ""}`}
                role={uploadError ? "alert" : "status"}
              >
                {uploadError || uploadMessage}
              </p>
            ) : null}
            <p className="catalog-source-note">
              Read-only snapshot from <strong>{sourceName}</strong>. Local uploads replace the table only in
              this browser session.
            </p>

            <div className="catalog-table-wrap">
              {section === "variations" ? (
                <table className="catalog-table">
                  <caption className="sr-only">WholeCell product variations</caption>
                  <thead>
                    <tr>
                      <th className="catalog-checkbox-column">
                        <input
                          aria-label="Select visible rows"
                          checked={
                            visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.id))
                          }
                          onChange={(event) => selectPage(event.target.checked)}
                          type="checkbox"
                        />
                      </th>
                      <th>ID</th>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Grade</th>
                      <th>Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        <td className="catalog-checkbox-column">
                          <input
                            aria-label={`Select ${row.id}`}
                            checked={selectedIds.has(row.id)}
                            onChange={(event) => {
                              const next = new Set(selectedIds);
                              if (event.target.checked) next.add(row.id);
                              else next.delete(row.id);
                              setSelectedIds(next);
                            }}
                            type="checkbox"
                          />
                        </td>
                        <td>
                          <button
                            className="catalog-link"
                            onClick={() => setSelectedVariation(row)}
                            type="button"
                          >
                            {row.id}
                          </button>
                        </td>
                        <td>
                          {row.sku ? (
                            <button
                              className="catalog-link catalog-sku-link"
                              onClick={() => setSelectedVariation(row)}
                              type="button"
                            >
                              {row.sku}
                            </button>
                          ) : (
                            <span className="catalog-empty-value">—</span>
                          )}
                        </td>
                        <td className="catalog-product-cell">
                          <strong>{productName(row)}</strong>
                          <small>{productDetails(row) || "—"}</small>
                        </td>
                        <td>{row.grade || "—"}</td>
                        <td>
                          {row.damages ? <span className="catalog-damage-tag">{row.damages}</span> : "—"}
                        </td>
                      </tr>
                    ))}
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td className="catalog-empty-row" colSpan={6}>
                          No product variations match these filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              ) : (
                <table className="catalog-table catalog-summary-table">
                  <caption className="sr-only">{sectionTitles[section]}</caption>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Variations</th>
                      <th>Sample SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSummaries.map((row) => (
                      <tr key={row.name}>
                        <td>
                          <strong>{row.name}</strong>
                        </td>
                        <td>{row.count.toLocaleString()}</td>
                        <td>{row.sampleSku}</td>
                      </tr>
                    ))}
                    {visibleSummaries.length === 0 ? (
                      <tr>
                        <td className="catalog-empty-row" colSpan={3}>
                          No catalog entries.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              )}
            </div>

            <div className="catalog-pagination">
              <span>
                Showing {resultCount ? (page - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(page * PAGE_SIZE, resultCount)} of {resultCount.toLocaleString()}
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
            </div>
          </div>
        </div>
      ) : (
        <section className="catalog-tenant-empty">
          <h2>This export is attached to the Device Mart workspace.</h2>
          <p>Your signed-in account does not have access to that tenant’s product snapshot.</p>
        </section>
      )}

      {selectedVariation ? (
        <div
          className="catalog-detail-backdrop"
          onClick={() => setSelectedVariation(undefined)}
          role="presentation"
        >
          <section
            aria-labelledby="catalog-detail-title"
            aria-modal="true"
            className="catalog-detail-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="catalog-detail-heading">
              <div>
                <p className="eyebrow">Product variation</p>
                <h2 id="catalog-detail-title">{productName(selectedVariation)}</h2>
              </div>
              <button
                aria-label="Close product details"
                className="catalog-detail-close"
                onClick={() => setSelectedVariation(undefined)}
                type="button"
              >
                ×
              </button>
            </div>
            <dl>
              {(
                [
                  "id",
                  "sku",
                  "manufacturer",
                  "model",
                  "variant",
                  "network",
                  "capacity",
                  "color",
                  "grade",
                  "damages",
                  "weight",
                  "weightUnit",
                ] as const
              ).map((key) => (
                <div key={key}>
                  <dt>
                    {key === "id"
                      ? "WholeCell ID"
                      : key === "sku"
                        ? "SKU"
                        : key === "damages"
                          ? "Conditions"
                          : key === "weightUnit"
                            ? "Weight unit"
                            : key.charAt(0).toUpperCase() + key.slice(1)}
                  </dt>
                  <dd>{selectedVariation[key] || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}
    </section>
  );
}
