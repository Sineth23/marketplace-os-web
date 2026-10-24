import Link from "next/link";
import { redirect } from "next/navigation";

import { OperationsEmptyState } from "../../../components/operations-empty-state";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { listCustomerOrganizations, listOrganizations } from "../../../lib/api";
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

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseOperationsFilters(params);
  const page = parsePageNumber(params.page);

  const customers = await listCustomerOrganizations(organization.id).catch(() => null);
  if (!customers) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="organizations">
        <section className="dashboard-intro" aria-labelledby="organizations-error">
          <div>
            <h2 id="organizations-error">Unable to load organizations</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const filtered = applyOperationsFilters(customers.items, filters, (customer) => ({
    search: customer.name,
  }));

  const { pageRows, pageCount, currentPage } = paginateOperationsRows(filtered, page, PAGE_LENGTH);

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="organizations">
      <section className="dashboard-intro" aria-labelledby="organizations-title">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 id="organizations-title">Organizations</h1>
          <p>The customers and vendors that orders are placed with.</p>
        </div>
      </section>

      {customers.items.length === 0 ? (
        <OperationsEmptyState
          title="No organizations yet"
          description="Organizations appear here once an import brings in the customers and vendors on your orders. Import a file to get started."
          importHref="/dashboard#partner-export"
          importLabel="Import an exported file"
        />
      ) : (
        <>
          <div className="operations-toolbar">
            <form className="operations-search" action="/dashboard/organizations" method="get">
              <input
                type="search"
                name="q"
                defaultValue={filters.search}
                placeholder="Search"
                aria-label="Search"
              />
              <button className="quiet-button" type="submit">
                Search
              </button>
            </form>
            <p className="operations-summary">
              {filtered.length.toLocaleString()} of {customers.items.length.toLocaleString()} shown
            </p>
          </div>
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{formatDate(customer.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="operations-pagination" aria-label="Organization pages">
            <span>
              Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            {currentPage > 1 ? (
              <Link
                className="quiet-button"
                href={`/dashboard/organizations${operationsFilterQuery(filters, {
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
                href={`/dashboard/organizations${operationsFilterQuery(filters, {
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
