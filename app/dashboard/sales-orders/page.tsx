import Link from "next/link";
import { redirect } from "next/navigation";

import { OperationsEmptyState } from "../../../components/operations-empty-state";
import { OperationsFilterBar, filterOptions } from "../../../components/operations-filter-bar";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { listOrganizations, listSalesOrders } from "../../../lib/api";
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

function formatAmount(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; channel?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseOperationsFilters(params);
  const page = parsePageNumber(params.page);

  const orders = await listSalesOrders(organization.id).catch(() => null);
  if (!orders) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="sales-orders">
        <section className="dashboard-intro" aria-labelledby="sales-orders-error">
          <div>
            <h2 id="sales-orders-error">Unable to load sales orders</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const filtered = applyOperationsFilters(orders.items, filters, (order) => ({
    search: `${order.sequentialId} ${order.customer ?? ""}`,
    status: order.status,
    channel: order.channel,
  }));

  const { pageRows, pageCount, currentPage } = paginateOperationsRows(filtered, page, PAGE_LENGTH);
  const query = operationsFilterQuery(filters, { page: page > 1 ? String(page) : undefined });

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="sales-orders">
      <section className="dashboard-intro" aria-labelledby="sales-orders-title">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 id="sales-orders-title">Sales Orders</h1>
          <p>Outbound orders, the customer each one went to, and what it was worth.</p>
        </div>
      </section>

      {orders.items.length === 0 ? (
        <OperationsEmptyState
          title="No sales orders yet"
          description="Sales orders appear here once an import brings in an order export. Import a file to get started."
          importHref="/dashboard#partner-export"
          importLabel="Import an exported file"
        />
      ) : (
        <>
          <OperationsFilterBar
            basePath="/dashboard/sales-orders"
            filters={filters}
            query={query}
            resultCount={filtered.length}
            totalCount={orders.items.length}
            selects={[
              {
                name: "status",
                label: "Status",
                options: filterOptions(orders.items, (order) => order.status),
              },
              {
                name: "channel",
                label: "Channel",
                options: filterOptions(orders.items, (order) => order.channel),
              },
            ]}
          />
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Channel</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((order) => (
                  <tr key={order.id}>
                    <td>{order.sequentialId}</td>
                    <td>{formatDate(order.date)}</td>
                    <td>{order.channel ?? "—"}</td>
                    <td>{order.customer ?? "—"}</td>
                    <td>{order.status ?? "—"}</td>
                    <td>{order.quantity.toLocaleString()}</td>
                    <td>{formatAmount(order.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="operations-pagination" aria-label="Sales order pages">
            <span>
              Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            {currentPage > 1 ? (
              <Link
                className="quiet-button"
                href={`/dashboard/sales-orders${operationsFilterQuery(filters, {
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
                href={`/dashboard/sales-orders${operationsFilterQuery(filters, {
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
