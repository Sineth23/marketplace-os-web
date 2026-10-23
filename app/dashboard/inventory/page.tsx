import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../components/workspace-shell";
import { InventoryImportForm } from "../../../components/inventory-import-form";
import { InventoryTable } from "../../../components/inventory-table";
import { listAllInventory, listAllInventoryUnits, listOrganizations } from "../../../lib/api";
import { mergeInventoryRows } from "../../../lib/inventory-filters";
import { session } from "../../../lib/auth";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    stateUpdate?: string;
  }>;
}) {
  if (!(await session())) redirect("/");
  const organization = (await listOrganizations())[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;

  const [inventory, units] = await Promise.all([
    listAllInventory(organization.id),
    listAllInventoryUnits(organization.id),
  ]);

  const rows = mergeInventoryRows(units, inventory);

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="inventory">
      <section className="product-catalog-page inventory-page" aria-labelledby="inventory-title">
        <header className="catalog-page-heading inventory-page-heading">
          <div>
            <p className="eyebrow">Device Mart Inventory</p>
            <h1 id="inventory-title">Device Mart Inventory</h1>
            <p className="inventory-description">
              Every serialized device in this workspace, with the filters you need to slice it by product,
              grade, status, and location.
            </p>
          </div>
          <div className="pricing-actions">
            <Link className="primary-button" href="/dashboard/inventory/new">
              Add inventory
            </Link>
            <Link className="quiet-button" href="/dashboard">
              Back to setup
            </Link>
          </div>
        </header>

        {params.created === "1" ? <p className="form-message success-banner">Inventory SKU added.</p> : null}
        {params.stateUpdate ? (
          <p className="form-message">
            Availability state {params.stateUpdate === "saved" ? "saved." : "could not be saved."}
          </p>
        ) : null}

        <InventoryImportForm organizationId={organization.id} initialBatch={null} />

        <InventoryTable rows={rows} />
      </section>
    </WorkspaceShell>
  );
}
