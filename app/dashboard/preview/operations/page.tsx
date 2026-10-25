import Link from "next/link";

import { OperationsEmptyState } from "../../../../components/operations-empty-state";
import { OperationsFilterBar, filterOptions } from "../../../../components/operations-filter-bar";
import { OperationsTable } from "../../../../components/operations-table";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import {
  applyOperationsFilters,
  paginateOperationsRows,
  parseOperationsFilters,
} from "../../../../lib/operations-filters";
import {
  fixtureOrganizations,
  fixtureProcessBatchItems,
  fixtureProcessBatches,
  fixtureProductVariations,
  fixturePurchaseOrders,
  fixtureSalesOrders,
  fixtureStockLevels,
  fixtureOrganization,
} from "../../../../lib/operations-fixtures";

/**
 * A preview of the operations screens, rendered with fixture data.
 *
 * The screens normally read from the backend, which is a separate repository.
 * This route renders the same layouts against representative data so the
 * screens can be reviewed without a running backend. The fixtures are not a
 * tenant's data, and nothing here can be written to.
 */

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

const screens = [
  { id: "process-batches", label: "Process Batches" },
  { id: "purchase-orders", label: "Purchase Orders" },
  { id: "sales-orders", label: "Sales Orders" },
  { id: "stock-levels", label: "Stock Levels" },
  { id: "organizations", label: "Organizations" },
  { id: "product-variations", label: "Product Variations" },
] as const;

export default async function OperationsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string; status?: string; grade?: string }>;
}) {
  const params = await searchParams;
  const filters = parseOperationsFilters(params);
  const screen = screens.find((item) => item.id === params.screen) ?? screens[0];

  return (
    <WorkspaceShell
      organizationName={fixtureOrganization.name}
      activeSection={screen.id === "product-variations" ? "product-variations" : screen.id}
    >
      <section className="dashboard-intro" aria-labelledby="preview-title">
        <div>
          <p className="eyebrow">Layout preview</p>
          <h1 id="preview-title">Operations screens</h1>
          <p>
            Rendered with fixture data so the layout can be reviewed without the backend. The data is
            representative, not a real tenant, and nothing here can be written to.
          </p>
        </div>
      </section>

      <nav className="operations-preview-nav" aria-label="Screen previews">
        {screens.map((item) => (
          <Link
            className={`quiet-button ${item.id === screen.id ? "active" : ""}`}
            href={`/dashboard/preview/operations?screen=${item.id}`}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {screen.id === "process-batches" ? (
        <>
          <OperationsFilterBar
            basePath="/dashboard/preview/operations"
            filters={filters}
            query={`?screen=${screen.id}`}
            resultCount={fixtureProcessBatches.length}
            totalCount={fixtureProcessBatches.length}
            selects={[
              {
                name: "status",
                label: "Status",
                options: filterOptions(fixtureProcessBatches, (batch) => batch.status),
              },
            ]}
          />
          <OperationsTable
            caption="Process batches"
            headers={["ID", "Date", "Description", "Status", "Items", "Created by"]}
          >
            {fixtureProcessBatches.map((batch) => (
              <tr key={batch.id}>
                <td>{batch.sequentialId}</td>
                <td>{formatDate(batch.createdAt)}</td>
                <td>{batch.title}</td>
                <td>
                  <span className={`status-badge status-${batch.status}`}>{batch.status}</span>
                </td>
                <td>{batch.itemCount.toLocaleString()}</td>
                <td>{batch.createdBy ?? "—"}</td>
              </tr>
            ))}
          </OperationsTable>
        </>
      ) : null}

      {screen.id === "purchase-orders" ? (
        <>
          <OperationsFilterBar
            basePath="/dashboard/preview/operations"
            filters={filters}
            query={`?screen=${screen.id}`}
            resultCount={fixturePurchaseOrders.length}
            totalCount={fixturePurchaseOrders.length}
            selects={[
              {
                name: "status",
                label: "Status",
                options: filterOptions(fixturePurchaseOrders, (order) => order.status),
              },
              {
                name: "channel",
                label: "Channel",
                options: filterOptions(fixturePurchaseOrders, (order) => order.channel),
              },
            ]}
          />
          <OperationsTable
            caption="Purchase orders"
            headers={["ID", "Date", "Channel", "Vendor", "Devices", "Transaction", "Status"]}
          >
            {fixturePurchaseOrders.map((order) => (
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
          </OperationsTable>
        </>
      ) : null}

      {screen.id === "sales-orders" ? (
        <>
          <OperationsFilterBar
            basePath="/dashboard/preview/operations"
            filters={filters}
            query={`?screen=${screen.id}`}
            resultCount={fixtureSalesOrders.length}
            totalCount={fixtureSalesOrders.length}
            selects={[
              {
                name: "status",
                label: "Status",
                options: filterOptions(fixtureSalesOrders, (order) => order.status),
              },
              {
                name: "channel",
                label: "Channel",
                options: filterOptions(fixtureSalesOrders, (order) => order.channel),
              },
            ]}
          />
          <OperationsTable
            caption="Sales orders"
            headers={["ID", "Date", "Channel", "Customer", "Status", "Items", "Amount"]}
          >
            {fixtureSalesOrders.map((order) => (
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
          </OperationsTable>
        </>
      ) : null}

      {screen.id === "stock-levels" ? (
        <>
          <OperationsFilterBar
            basePath="/dashboard/preview/operations"
            filters={filters}
            query={`?screen=${screen.id}`}
            resultCount={fixtureStockLevels.length}
            totalCount={fixtureStockLevels.length}
            selects={[
              {
                name: "grade",
                label: "Grade",
                options: filterOptions(fixtureStockLevels, (level) => level.grade),
              },
            ]}
          />
          <OperationsTable
            caption="Stock levels"
            headers={["SKU", "Product", "Grade", "On hand", "Outstanding", "Available"]}
          >
            {fixtureStockLevels.map((level) => (
              <tr key={level.skuId}>
                <td>{level.sourceSku}</td>
                <td>
                  {[level.manufacturer, level.model, level.variant, level.capacity, level.color]
                    .filter(Boolean)
                    .join(" ")}
                </td>
                <td>{level.grade ?? "—"}</td>
                <td>{level.onHand.toLocaleString()}</td>
                <td>{level.outstanding.toLocaleString()}</td>
                <td>{level.available.toLocaleString()}</td>
              </tr>
            ))}
          </OperationsTable>
        </>
      ) : null}

      {screen.id === "organizations" ? (
        <OperationsTable caption="Organizations" headers={["Name", "Created"]}>
          {fixtureOrganizations.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{formatDate(customer.createdAt)}</td>
            </tr>
          ))}
        </OperationsTable>
      ) : null}

      {screen.id === "product-variations" ? (
        <>
          <OperationsFilterBar
            basePath="/dashboard/preview/operations"
            filters={filters}
            query={`?screen=${screen.id}`}
            resultCount={fixtureProductVariations.length}
            totalCount={fixtureProductVariations.length}
            selects={[
              {
                name: "grade",
                label: "Grade",
                options: filterOptions(fixtureProductVariations, (variation) => variation.grade),
              },
              {
                name: "condition",
                label: "Condition",
                options: filterOptions(fixtureProductVariations, (variation) => variation.conditions),
              },
            ]}
          />
          <OperationsTable caption="Product variations" headers={["SKU", "Product", "Grade", "Conditions"]}>
            {fixtureProductVariations.map((variation) => (
              <tr key={variation.id}>
                <td>{variation.sku}</td>
                <td>{variation.title ?? "—"}</td>
                <td>{variation.grade ?? "—"}</td>
                <td>{variation.conditions ?? "—"}</td>
              </tr>
            ))}
          </OperationsTable>
        </>
      ) : null}

      <section className="dashboard-intro" aria-labelledby="preview-batch-title">
        <div>
          <h2 id="preview-batch-title">Batch detail</h2>
          <p>The batch detail view, showing the units a batch acted on.</p>
        </div>
      </section>
      <OperationsTable
        caption="Items in a process batch"
        headers={[
          "PO",
          "Product",
          "Unit ID",
          "ESN / serial",
          "Grade",
          "Damages",
          "Status",
          "Location",
          "Sold",
          "Order",
        ]}
      >
        {applyOperationsFilters(fixtureProcessBatchItems, filters, () => ({ search: "" })).map((item) => (
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
      </OperationsTable>

      <section className="dashboard-intro" aria-labelledby="preview-empty-title">
        <div>
          <h2 id="preview-empty-title">Empty state</h2>
          <p>What a screen shows before any data has been imported.</p>
        </div>
      </section>
      <OperationsEmptyState
        title="No process batches yet"
        description="Batches appear here once an import brings in inventory that has been grouped for a change. Import a file to get started."
        importHref="/dashboard#partner-export"
        importLabel="Import an exported file"
      />
      {paginateOperationsRows(fixtureProcessBatches, 1, 100).pageCount}
    </WorkspaceShell>
  );
}
