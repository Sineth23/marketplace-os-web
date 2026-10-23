import Link from "next/link";
import { redirect } from "next/navigation";

import { BulkPricingForm, type BulkPricingRow } from "../../../../components/bulk-pricing-form";
import { ReloadButton } from "../../../../components/reload-button";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { listAllInventory, listInventoryPricing, listOrganizations } from "../../../../lib/api";
import { session } from "../../../../lib/auth";

export default async function BulkPricingPage() {
  if (!(await session())) redirect("/");

  let organization;
  try {
    organization = (await listOrganizations())[0];
  } catch {
    organization = undefined;
  }

  if (!organization) {
    return (
      <WorkspaceShell organizationName="" activeSection="pricing">
        <section className="dashboard-intro" aria-labelledby="bulk-pricing-orgs-error-title">
          <div>
            <h2 id="bulk-pricing-orgs-error-title">Unable to load your workspace</h2>
            <p className="form-message error">
              The workspace service is temporarily unavailable. Your data is unchanged.
            </p>
            <ReloadButton />
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  let rows: BulkPricingRow[] = [];
  let loadError = false;

  try {
    const [inventory, pricing] = await Promise.all([
      listAllInventory(organization.id),
      listInventoryPricing(organization.id),
    ]);

    const pricingBySkuId = new Map(pricing.map((item) => [item.skuId, item]));

    rows = inventory.map((item) => {
      const current = pricingBySkuId.get(item.id);
      return {
        id: item.id,
        sourceSku: item.sourceSku,
        manufacturer: item.manufacturer ?? "",
        model: item.model ?? "",
        capacity: item.capacity ?? "",
        grade: item.grade ?? "",
        price: current?.price ?? null,
        isActive: current?.isActive ?? true,
      };
    });
  } catch {
    loadError = true;
  }

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="pricing">
      <section className="dashboard-intro" aria-labelledby="bulk-pricing-title">
        <div>
          <p className="eyebrow">Pricing</p>
          <h1 id="bulk-pricing-title">Bulk pricing</h1>
          <p>
            Set the same default sales price across many inventory SKUs at once. Changes apply to the SKUs you
            select and do not affect sales orders that already exist.
          </p>
        </div>
        <div className="pricing-actions">
          <Link className="quiet-button pricing-back-link" href="/dashboard/pricing">
            Back to pricing
          </Link>
        </div>
      </section>

      {loadError ? (
        <section className="dashboard-intro" aria-labelledby="bulk-pricing-load-error-title">
          <div>
            <h2 id="bulk-pricing-load-error-title">Unable to load inventory prices</h2>
            <p className="form-message error">
              The pricing service is temporarily unavailable. Your existing prices are unchanged.
            </p>
            <ReloadButton />
          </div>
        </section>
      ) : (
        <BulkPricingForm rows={rows} organizationId={organization.id} />
      )}
    </WorkspaceShell>
  );
}
