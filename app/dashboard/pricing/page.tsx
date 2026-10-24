import { redirect } from "next/navigation";

import { PricingFilterBar } from "../../../components/pricing-filter-bar";
import { PricingUpload } from "../../../components/pricing-upload";
import { PricingWorkspace } from "../../../components/pricing-workspace";
import { ReloadButton } from "../../../components/reload-button";
import { WorkspaceShell } from "../../../components/workspace-shell";
import {
  listAllInventory,
  listInventoryPricing,
  listOrganizations,
  type InventorySku,
} from "../../../lib/api";
import { session } from "../../../lib/auth";
import {
  applyPricingFilters,
  paginatePricingRows,
  parseInventoryFilter,
  parsePriceFilter,
  pricingFilterQuery,
  type PricingFilterRow,
} from "../../../lib/pricing-filters";
import { loadSkuUnitStatusCounts } from "../../../lib/pricing-inventory-status";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    price?: string;
    inventory?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  if (!(await session())) redirect("/");

  let organization;
  let organizationsLoadError = false;
  try {
    organization = (await listOrganizations())[0];
  } catch {
    organizationsLoadError = true;
  }

  const params = await searchParams;
  const search = params.search?.trim() ?? "";

  if (organizationsLoadError || !organization) {
    return (
      <WorkspaceShell organizationName="" activeSection="pricing">
        <section className="dashboard-intro" aria-labelledby="pricing-orgs-error-title">
          <div>
            <h2 id="pricing-orgs-error-title">Unable to load your workspace</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
            <ReloadButton />
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  let inventory: readonly InventorySku[] = [];
  let inventoryLoadError = false;
  try {
    inventory = await listAllInventory(organization.id);
  } catch {
    inventoryLoadError = true;
  }

  // Saved prices back the spreadsheet export. If they cannot be read the export
  // stays disabled, because a download with blank prices would wipe them on re-upload.
  const priceBySkuId = new Map<string, number | null>();
  let pricesAvailable = false;
  try {
    for (const item of await listInventoryPricing(organization.id)) {
      priceBySkuId.set(item.skuId, item.price);
    }
    pricesAvailable = true;
  } catch {
    pricesAvailable = false;
  }

  // Per-SKU unit counts are needed for the inventory filter. They are computed
  // on the server so the full unit list never reaches the browser.
  let unitCounts = new Map<string, { unitCount: number; soldCount: number; availableCount: number }>();
  let unitCountsLoadError = false;
  try {
    unitCounts = await loadSkuUnitStatusCounts(organization.id);
  } catch {
    unitCountsLoadError = true;
  }

  const filters = {
    search,
    price: parsePriceFilter(params.price),
    inventory: parseInventoryFilter(params.inventory),
  };

  const filterRows: PricingFilterRow[] = inventory.map((item) => {
    const counts = unitCounts.get(item.id);
    return {
      id: item.id,
      sourceSku: item.sourceSku,
      manufacturer: item.manufacturer ?? "",
      model: item.model ?? "",
      variant: item.variant ?? "",
      network: item.network ?? "",
      capacity: item.capacity ?? "",
      color: item.color ?? "",
      grade: item.grade ?? "",
      damages: item.damages ?? "",
      quantity: 1,
      price: priceBySkuId.get(item.id) ?? null,
      unitCount: counts?.unitCount ?? 0,
      soldCount: counts?.soldCount ?? 0,
      availableCount: counts?.availableCount ?? 0,
    };
  });

  const filteredRows = applyPricingFilters(filterRows, filters);
  const paged = paginatePricingRows(filteredRows, Number(params.page) || 1);

  const toPricingRow = (row: PricingFilterRow) => ({
    id: row.id,
    sourceSku: row.sourceSku,
    manufacturer: row.manufacturer,
    model: row.model,
    variant: row.variant,
    network: row.network,
    capacity: row.capacity,
    color: row.color,
    grade: row.grade,
    damages: row.damages,
    quantity: row.quantity,
  });

  const pageRows = paged.rows.map(toPricingRow);
  const resultRows = filteredRows.map(toPricingRow);
  const exportRows = filteredRows.map((row) => ({
    ...toPricingRow(row),
    skuId: row.id,
    price: row.price,
  }));

  const isFiltered = filters.search !== "" || filters.price !== "all" || filters.inventory !== "all";

  const query = pricingFilterQuery(filters);
  const pageLink = (targetPage: number) => {
    const next = new URLSearchParams(query);
    if (targetPage > 1) next.set("page", String(targetPage));
    const search = next.toString();
    return search ? `/dashboard/pricing?${search}` : "/dashboard/pricing";
  };

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="pricing">
      <section className="product-catalog-page pricing-page" aria-labelledby="pricing-title">
        <header className="catalog-page-heading pricing-page-heading">
          <div>
            <p className="eyebrow">Pricing</p>
            <h1 id="pricing-title">Default sales prices</h1>
            <p className="pricing-description">
              The prices that you set here will be the default sales price when adding order items or
              inventory to an order. It does not affect sales orders created via ecommerce integrations. You
              can still change the price of each order item individually.
            </p>
          </div>
        </header>

        {unitCountsLoadError ? (
          <p className="form-message error">
            Inventory unit counts could not be loaded, so the inventory filter cannot be applied.
          </p>
        ) : null}

        <PricingFilterBar
          filters={filters}
          resultCount={filteredRows.length}
          totalCount={filterRows.length}
        />
      </section>

      {inventoryLoadError ? (
        <section className="dashboard-intro" aria-labelledby="pricing-load-error-title">
          <div>
            <h2 id="pricing-load-error-title">Unable to load inventory prices</h2>
            <p className="form-message error">
              The pricing service is temporarily unavailable. Your existing prices are unchanged.
            </p>
            <ReloadButton />
          </div>
        </section>
      ) : (
        <>
          <PricingUpload organizationId={organization.id} />

          <PricingWorkspace
            pageRows={pageRows}
            resultRows={resultRows}
            exportRows={exportRows}
            organizationId={organization.id}
            canExport={pricesAvailable}
            isFiltered={isFiltered}
          />

          <nav className="catalog-pagination" aria-label="Pricing pages">
            <span>
              Showing {paged.start.toLocaleString()}–{paged.end.toLocaleString()} of{" "}
              {paged.total.toLocaleString()}
            </span>
            <div>
              {paged.page > 1 ? (
                <a className="catalog-page-button" href={pageLink(paged.page - 1)}>
                  Prev
                </a>
              ) : (
                <span className="catalog-page-button" aria-disabled="true">
                  Prev
                </span>
              )}
              <span>
                Page {paged.page} of {paged.pageCount}
              </span>
              {paged.page < paged.pageCount ? (
                <a className="catalog-page-button" href={pageLink(paged.page + 1)}>
                  Next
                </a>
              ) : (
                <span className="catalog-page-button" aria-disabled="true">
                  Next
                </span>
              )}
            </div>
          </nav>
        </>
      )}
    </WorkspaceShell>
  );
}
