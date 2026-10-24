import Link from "next/link";
import { redirect } from "next/navigation";

import { OperationsEmptyState } from "../../../components/operations-empty-state";
import { OperationsFilterBar, filterOptions } from "../../../components/operations-filter-bar";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { listOrganizations, listStockLevels } from "../../../lib/api";
import {
  applyOperationsFilters,
  operationsFilterQuery,
  paginateOperationsRows,
  parseOperationsFilters,
  parsePageNumber,
} from "../../../lib/operations-filters";
import { session } from "../../../lib/auth";

const PAGE_LENGTH = 100;

export default async function StockLevelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; grade?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseOperationsFilters(params);
  const page = parsePageNumber(params.page);

  const levels = await listStockLevels(organization.id).catch(() => null);
  if (!levels) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="stock-levels">
        <section className="dashboard-intro" aria-labelledby="stock-levels-error">
          <div>
            <h2 id="stock-levels-error">Unable to load stock levels</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const filtered = applyOperationsFilters(levels.items, filters, (level) => ({
    search: `${level.sourceSku} ${level.manufacturer ?? ""} ${level.model ?? ""} ${level.variant ?? ""}`,
    grade: level.grade,
  }));

  const { pageRows, pageCount, currentPage } = paginateOperationsRows(filtered, page, PAGE_LENGTH);
  const query = operationsFilterQuery(filters, { page: page > 1 ? String(page) : undefined });

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="stock-levels">
      <section className="dashboard-intro" aria-labelledby="stock-levels-title">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 id="stock-levels-title">Stock Levels</h1>
          <p>
            What each catalog SKU has on hand, what is already committed to an open order, and what can still
            be sold.
          </p>
        </div>
      </section>

      {levels.items.length === 0 ? (
        <OperationsEmptyState
          title="No stock levels yet"
          description="Stock levels appear here once an import brings in inventory. Import a file to get started."
          importHref="/dashboard#partner-export"
          importLabel="Import an exported file"
        />
      ) : (
        <>
          <OperationsFilterBar
            basePath="/dashboard/stock-levels"
            filters={filters}
            query={query}
            resultCount={filtered.length}
            totalCount={levels.items.length}
            selects={[
              {
                name: "grade",
                label: "Grade",
                options: filterOptions(levels.items, (level) => level.grade),
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
                  <th>On hand</th>
                  <th>Outstanding</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((level) => (
                  <tr key={level.skuId}>
                    <td>{level.sourceSku}</td>
                    <td>
                      {[level.manufacturer, level.model, level.variant, level.capacity, level.color]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td>{level.grade ?? "—"}</td>
                    <td>{level.onHand.toLocaleString()}</td>
                    <td>{level.outstanding.toLocaleString()}</td>
                    <td>{level.available.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="operations-pagination" aria-label="Stock level pages">
            <span>
              Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            {currentPage > 1 ? (
              <Link
                className="quiet-button"
                href={`/dashboard/stock-levels${operationsFilterQuery(filters, {
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
                href={`/dashboard/stock-levels${operationsFilterQuery(filters, {
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
