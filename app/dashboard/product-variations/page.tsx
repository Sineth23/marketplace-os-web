import Link from "next/link";
import { redirect } from "next/navigation";

import { OperationsEmptyState } from "../../../components/operations-empty-state";
import { OperationsFilterBar, filterOptions } from "../../../components/operations-filter-bar";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { listOrganizations, listProductVariations } from "../../../lib/api";
import {
  applyOperationsFilters,
  operationsFilterQuery,
  paginateOperationsRows,
  parseOperationsFilters,
  parsePageNumber,
} from "../../../lib/operations-filters";
import { session } from "../../../lib/auth";

const PAGE_LENGTH = 100;

export default async function ProductVariationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; grade?: string; condition?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseOperationsFilters(params);
  const page = parsePageNumber(params.page);

  const variations = await listProductVariations(organization.id).catch(() => null);
  if (!variations) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="product-variations">
        <section className="dashboard-intro" aria-labelledby="product-variations-error">
          <div>
            <h2 id="product-variations-error">Unable to load product variations</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const filtered = applyOperationsFilters(variations.items, filters, (variation) => ({
    search: `${variation.sku} ${variation.title ?? ""} ${variation.manufacturer ?? ""} ${
      variation.model ?? ""
    }`,
    grade: variation.grade,
    condition: variation.conditions,
  }));

  const { pageRows, pageCount, currentPage } = paginateOperationsRows(filtered, page, PAGE_LENGTH);
  const query = operationsFilterQuery(filters, { page: page > 1 ? String(page) : undefined });

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="product-variations">
      <section className="dashboard-intro" aria-labelledby="product-variations-title">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 id="product-variations-title">Product Variations</h1>
          <p>
            The catalog records that inventory units belong to. Each variation is one product in one
            configuration, with its own grade and condition.
          </p>
        </div>
      </section>

      {variations.items.length === 0 ? (
        <OperationsEmptyState
          title="No product variations yet"
          description="Product variations appear here once an import brings in the catalog. Import a file to get started."
          importHref="/dashboard#partner-export"
          importLabel="Import an exported file"
        />
      ) : (
        <>
          <OperationsFilterBar
            basePath="/dashboard/product-variations"
            filters={filters}
            query={query}
            resultCount={filtered.length}
            totalCount={variations.items.length}
            selects={[
              {
                name: "grade",
                label: "Grade",
                options: filterOptions(variations.items, (variation) => variation.grade),
              },
              {
                name: "condition",
                label: "Condition",
                options: filterOptions(variations.items, (variation) => variation.conditions),
              },
            ]}
          />
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Grade</th>
                  <th>Conditions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((variation) => (
                  <tr key={variation.id}>
                    <td>{variation.sku}</td>
                    <td>
                      {variation.title ??
                        [variation.manufacturer, variation.model, variation.variant]
                          .filter(Boolean)
                          .join(" ") ??
                        "—"}
                    </td>
                    <td>{variation.grade ?? "—"}</td>
                    <td>{variation.conditions ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="operations-pagination" aria-label="Product variation pages">
            <span>
              Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            {currentPage > 1 ? (
              <Link
                className="quiet-button"
                href={`/dashboard/product-variations${operationsFilterQuery(filters, {
                  page: String(currentPage - 1),
                })}`}
              >
                Previous
              </Link>
            ) : null}
            <span>
              Page {currentPage} of {pageCount}
            </span>
            {currentPage < pageCount ? (
              <Link
                className="quiet-button"
                href={`/dashboard/product-variations${operationsFilterQuery(filters, {
                  page: String(currentPage + 1),
                })}`}
              >
                Next
              </Link>
            ) : null}
          </nav>
        </>
      )}
    </WorkspaceShell>
  );
}
