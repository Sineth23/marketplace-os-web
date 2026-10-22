import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../components/workspace-shell";
import { PricingTable } from "../../../components/pricing-table";
import { PricingUpload } from "../../../components/pricing-upload";
import { listAllInventory, listOrganizations, type InventorySku } from "../../../lib/api";
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
            <button
              className="primary-button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </button>
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

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="pricing">
      <section className="dashboard-intro" aria-labelledby="pricing-title">
        <div>
          <p className="eyebrow">Pricing</p>
          <h1 id="pricing-title">Default sales prices</h1>
          <p>
            The prices that you set here will be the default sales price when adding order items or inventory
            to an order. It does not affect sales orders created via ecommerce integrations. You can still
            change the price of each order item individually.
          </p>
        </div>
        <div className="pricing-actions">
          <button className="primary-button" onClick={() => {}}>
            Bulk Pricing
          </button>
          <button
            className="quiet-button"
            onClick={() => document.getElementById("csv-upload-input")?.click()}
          >
            Upload Spreadsheet
          </button>
          <button className="quiet-button">Download Spreadsheet</button>
          <div className="pricing-search">
            <input name="search" defaultValue={search} placeholder="Search SKU, manufacturer, or model" />
            <button className="primary-button">Search</button>
          </div>
        </div>
      </section>

      {inventoryLoadError ? (
        <section className="dashboard-intro" aria-labelledby="pricing-load-error-title">
          <div>
            <h2 id="pricing-load-error-title">Unable to load inventory prices</h2>
            <p className="form-message error">
              The pricing service is temporarily unavailable. Your existing prices are unchanged.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </section>
      ) : (
        <>
          <PricingUpload organizationId={organization.id} />

          <PricingTable rows={pricingRows} organizationId={organization.id} />

          <nav className="inventory-pagination" aria-label="Inventory pages">
            <span>Showing {pricingRows.length.toLocaleString()} item(s)</span>
          </nav>
        </>
      )}
    </WorkspaceShell>
  );
}
