import { redirect } from "next/navigation";

import { PricingTable } from "../../../components/pricing-table";
import { PricingToolbar } from "../../../components/pricing-toolbar";
import { PricingUpload } from "../../../components/pricing-upload";
import { ReloadButton } from "../../../components/reload-button";
import { WorkspaceShell } from "../../../components/workspace-shell";
import {
  listAllInventory,
  listInventoryPricing,
  listOrganizations,
  type InventorySku,
} from "../../../lib/api";
import { session } from "../../../lib/auth";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; saved?: string; error?: string }>;
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
    inventory = await listAllInventory(organization.id, search);
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

  // All inventory SKUs are priced - show everything
  const pricingRows = inventory.map((item) => ({
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
  }));

  const exportRows = pricingRows.map((row) => ({
    ...row,
    skuId: row.id,
    price: priceBySkuId.get(row.id) ?? null,
  }));

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
          <div className="pricing-actions">
            <PricingToolbar rows={exportRows} canExport={pricesAvailable} />
            <form className="catalog-search pricing-search" method="get" role="search">
              <span aria-hidden="true">⌕</span>
              <input
                name="search"
                type="search"
                defaultValue={search}
                placeholder="Search SKU, manufacturer, or model"
                aria-label="Search pricing"
              />
            </form>
          </div>
        </header>
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

          <PricingTable rows={pricingRows} organizationId={organization.id} />

          <nav className="catalog-pagination" aria-label="Inventory pages">
            <span>Showing {pricingRows.length.toLocaleString()} item(s)</span>
          </nav>
        </>
      )}
    </WorkspaceShell>
  );
}
