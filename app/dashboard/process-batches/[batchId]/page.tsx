import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../../components/workspace-shell";
import { listOrganizations, listProcessBatchItems, listProcessBatches } from "../../../../lib/api";
import { paginateOperationsRows, parsePageNumber } from "../../../../lib/operations-filters";
import { session } from "../../../../lib/auth";

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

export default async function ProcessBatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const { batchId } = await params;
  const query = await searchParams;
  const page = parsePageNumber(query.page);

  const [batches, items] = await Promise.all([
    listProcessBatches(organization.id).catch(() => null),
    listProcessBatchItems(organization.id, batchId).catch(() => null),
  ]);
  if (!batches || !items) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="process-batches">
        <section className="dashboard-intro" aria-labelledby="batch-detail-error">
          <div>
            <h2 id="batch-detail-error">Unable to load this batch</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
            <Link className="quiet-button" href="/dashboard/process-batches">
              Back to process batches
            </Link>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const batch = batches.items.find((item) => item.id === batchId);
  if (!batch) {
    return (
      <WorkspaceShell organizationName={organization.name} activeSection="process-batches">
        <section className="dashboard-intro" aria-labelledby="batch-missing-title">
          <div>
            <h2 id="batch-missing-title">This batch is not available</h2>
            <p className="form-message error">
              The batch does not exist in this workspace, or it was removed.
            </p>
            <Link className="quiet-button" href="/dashboard/process-batches">
              Back to process batches
            </Link>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  const { pageRows, pageCount, currentPage } = paginateOperationsRows(items.items, page, PAGE_LENGTH);

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="process-batches">
      <section className="dashboard-intro" aria-labelledby="batch-detail-title">
        <div>
          <p className="eyebrow">Process batch</p>
          <h1 id="batch-detail-title">
            {batch.sequentialId} {batch.title}
          </h1>
          <p>
            {batch.itemCount.toLocaleString()} unit{batch.itemCount === 1 ? "" : "s"} ·{" "}
            <span className={`status-badge status-${batch.status}`}>{batch.status}</span> · created{" "}
            {formatDate(batch.createdAt)}
            {batch.createdBy ? ` by ${batch.createdBy}` : ""}
          </p>
        </div>
        <Link className="quiet-button" href="/dashboard/process-batches">
          Back to process batches
        </Link>
      </section>

      {batch.error ? (
        <p className="form-message error" role="status">
          This batch did not finish: {batch.error}
        </p>
      ) : null}

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>PO</th>
              <th>Product</th>
              <th>Unit ID</th>
              <th>ESN / serial</th>
              <th>Grade</th>
              <th>Damages</th>
              <th>Status</th>
              <th>Location</th>
              <th>Sold</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((item) => (
              <tr key={item.id}>
                <td>{item.purchaseOrder ?? "—"}</td>
                <td>{item.product ?? "—"}</td>
                <td>{item.sourceUnitId ?? "—"}</td>
                <td>{item.serialNumber ?? "—"}</td>
                <td>{item.grade ?? "—"}</td>
                <td>{item.damages ?? "—"}</td>
                <td>{item.status ?? "—"}</td>
                <td>{item.location ?? "—"}</td>
                <td>{formatAmount(item.salePrice)}</td>
                <td>{item.salesOrder ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="operations-pagination" aria-label="Batch item pages">
        <span>
          Showing {pageRows.length.toLocaleString()} of {items.items.length.toLocaleString()}
        </span>
        {currentPage > 1 ? (
          <Link
            className="quiet-button"
            href={`/dashboard/process-batches/${batch.id}?page=${currentPage - 1}`}
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
            href={`/dashboard/process-batches/${batch.id}?page=${currentPage + 1}`}
          >
            Next
          </Link>
        ) : null}
      </nav>
    </WorkspaceShell>
  );
}
