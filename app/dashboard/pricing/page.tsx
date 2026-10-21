import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../components/workspace-shell";
import { InventoryImportForm } from "../../../components/inventory-import-form";
import { PricingTable } from "../../../components/pricing-table";
import { PricingUpload } from "../../../components/pricing-upload";
import { listAllInventory, listAllInventoryUnits, listOrganizations } from "../../../lib/api";
import { session } from "../../../lib/auth";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; saved?: string; error?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organization = (await listOrganizations())[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const search = params.search?.trim() ?? "";

  const [inventory, units] = await Promise.all([
    listAllInventory(organization.id, search),
    listAllInventoryUnits(organization.id),
  ]);

  // Count available units per SKU
  const availableUnitsBySku = new Map<string, number>();
  for (const unit of units) {
    if (unit.inventoryState === "available") {
      const count = availableUnitsBySku.get(unit.skuId) ?? 0;
      availableUnitsBySku.set(unit.skuId, count + 1);
    }
  }

  // Only include SKUs that have at least one available unit, cross-referenced with inventory
  const pricingRows = inventory
    .filter((item) => availableUnitsBySku.has(item.id))
    .map((item) => ({
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
      quantity: availableUnitsBySku.get(item.id) ?? 0,
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
          <Link className="primary-button" href="#">
            Bulk Pricing
          </Link>
          <Link className="quiet-button" href="#">
            Upload Spreadsheet
          </Link>
          <Link className="quiet-button" href="#">
            Download Spreadsheet
          </Link>
          <div className="pricing-search">
            <input name="search" defaultValue={search} placeholder="Search SKU, manufacturer, or model" />
            <button className="primary-button">Search</button>
          </div>
        </div>
      </section>

      {params.saved === "1" ? <p className="form-message success-banner">Prices saved.</p> : null}
      {params.error ? <p className="form-message error">Could not save prices. Please try again.</p> : null}

      <PricingUpload organizationId={organization.id} />

      <PricingTable rows={pricingRows} organizationId={organization.id} />

      <nav className="inventory-pagination" aria-label="Inventory pages">
        <span>
          Showing {pricingRows.length.toLocaleString()} item(s)
        </span>
      </nav>
    </WorkspaceShell>
  );
}
