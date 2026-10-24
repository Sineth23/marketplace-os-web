import Link from "next/link";
import { redirect } from "next/navigation";

import { OperationsEmptyState } from "../../../components/operations-empty-state";
import { OperationsFilterBar, filterOptions } from "../../../components/operations-filter-bar";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { listOrganizations, listProcessBatches } from "../../../lib/api";
import {
  applyOperationsFilters,
  operationsFilterQuery,
  paginateOperationsRows,
  parseOperationsFilters,
  parsePageNumber,
} from "../../../lib/operations-filters";
import { session } from "../../../lib/auth";

const PAGE_LENGTH = 100;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default async function ProcessBatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseOperationsFilters(params);
  const page = parsePageNumber(params.page);

  const batches = await listProcessBatches(organization.id).catch(() => null);
  if (!batches) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="process-batches">
        <section className="dashboard-intro" aria-labelledby="process-batches-error">
          <div>
            <h2 id="process-batches-error">Unable to load process batches</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const filtered = applyOperationsFilters(batches.items, filters, (batch) => ({
    search: `${batch.sequentialId} ${batch.title} ${batch.description ?? ""} ${batch.createdBy ?? ""}`,
    status: batch.status,
  }));

  const { pageRows, pageCount, currentPage } = paginateOperationsRows(filtered, page, PAGE_LENGTH);
  const query = operationsFilterQuery(filters, { page: page > 1 ? String(page) : undefined });

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="process-batches">
      <section className="dashboard-intro" aria-labelledby="process-batches-title">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 id="process-batches-title">Process Batches</h1>
          <p>
            A batch is a set of inventory units staged for a bulk change. Each batch records what it changed,
            when it ran, and who ran it.
          </p>
        </div>
      </section>

      {batches.items.length === 0 ? (
        <OperationsEmptyState
          title="No process batches yet"
          description="Batches appear here once an import brings in inventory that has been grouped for a change. Import a file to get started."
          importHref="/dashboard#partner-export"
          importLabel="Import an exported file"
        />
      ) : (
        <>
          <OperationsFilterBar
            basePath="/dashboard/process-batches"
            filters={filters}
            query={query}
            resultCount={filtered.length}
            totalCount={batches.items.length}
            selects={[
              {
                name: "status",
                label: "Status",
                options: filterOptions(batches.items, (batch) => batch.status),
              },
            ]}
          />
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Created by</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <Link href={`/dashboard/process-batches/${batch.id}`}>{batch.sequentialId}</Link>
                    </td>
                    <td>{formatDate(batch.createdAt)}</td>
                    <td>{batch.title}</td>
                    <td>
                      <span className={`status-badge status-${batch.status}`}>{batch.status}</span>
                    </td>
                    <td>{batch.itemCount.toLocaleString()}</td>
                    <td>{batch.createdBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="operations-pagination" aria-label="Process batch pages">
            <span>
              Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            {currentPage > 1 ? (
              <Link
                className="quiet-button"
                href={`/dashboard/process-batches${operationsFilterQuery(filters, {
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
                href={`/dashboard/process-batches${operationsFilterQuery(filters, {
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
