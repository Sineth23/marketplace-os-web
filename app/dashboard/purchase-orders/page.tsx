import Link from "next/link";
import { redirect } from "next/navigation";

import { OperationsEmptyState } from "../../../components/operations-empty-state";
import { OperationsFilterBar, filterOptions } from "../../../components/operations-filter-bar";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { listOrganizations, listPurchaseOrders } from "../../../lib/api";
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

export default async function PurchaseOrdersPage({
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

  const orders = await listPurchaseOrders(organization.id).catch(() => null);
  if (!orders) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="purchase-orders">
        <section className="dashboard-intro" aria-labelledby="purchase-orders-error">
          <div>
            <h2 id="purchase-orders-error">Unable to load purchase orders</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const filtered = applyOperationsFilters(orders.items, filters, (order) => ({
    search: `${order.sequentialId} ${order.organization ?? ""} ${order.transactionNumber ?? ""}`,
    status: order.status,
    channel: order.channel,
  }));

  const { pageRows, pageCount, currentPage } = paginateOperationsRows(filtered, page, PAGE_LENGTH);
  const query = operationsFilterQuery(filters, { page: page > 1 ? String(page) : undefined });

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="purchase-orders">
      <section className="dashboard-intro" aria-labelledby="purchase-orders-title">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 id="purchase-orders-title">Purchase Orders</h1>
          <p>
            Inbound orders and the devices each one brought in. The vendor is the customer or supplier the
            order was placed with.
          </p>
        </div>
      </section>

      {orders.items.length === 0 ? (
        <OperationsEmptyState
          title="No purchase orders yet"
          description="Purchase orders appear here once an import brings in an order export. Import a file to get started."
          importHref="/dashboard#partner-export"
          importLabel="Import an exported file"
        />
      ) : (
        <>
          <OperationsFilterBar
            basePath="/dashboard/purchase-orders"
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
                  <th>Vendor</th>
                  <th>Devices</th>
                  <th>Transaction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((order) => (
                  <tr key={order.id}>
                    <td>{order.sequentialId}</td>
                    <td>{formatDate(order.date)}</td>
                    <td>{order.channel ?? "—"}</td>
                    <td>{order.organization ?? "—"}</td>
                    <td>{order.quantity.toLocaleString()}</td>
                    <td>{order.transactionNumber ?? "—"}</td>
                    <td>{order.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="operations-pagination" aria-label="Purchase order pages">
            <span>
              Showing {pageRows.length.toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            {currentPage > 1 ? (
              <Link
                className="quiet-button"
                href={`/dashboard/purchase-orders${operationsFilterQuery(filters, {
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
                href={`/dashboard/purchase-orders${operationsFilterQuery(filters, {
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
