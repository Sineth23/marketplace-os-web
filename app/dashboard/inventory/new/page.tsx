import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../../components/workspace-shell";
import { listOrganizations } from "../../../../lib/api";
import { session } from "../../../../lib/auth";
import { createInventorySkuAction } from "../../actions";

export default async function NewInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organization = (await listOrganizations())[0];
  if (!organization) redirect("/dashboard");
  const params = await searchParams;
  const errorMessage =
    params.error === "sku-required"
      ? "Enter a SKU before saving."
      : params.error === "create-failed"
        ? "We could not save this SKU. It may already exist in this workspace."
        : "";

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="inventory">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Inventory catalog</p>
          <h1>Add inventory</h1>
          <p>Create one catalog SKU now. CSV review and serialized units will build on this same tenant-safe flow.</p>
        </div>
        <Link className="quiet-button" href="/dashboard/inventory">
          Back to inventory
        </Link>
      </section>
      <form className="inventory-create-form" action={createInventorySkuAction}>
        <input type="hidden" name="organizationId" value={organization.id} />
        <div className="form-section-heading">
          <div>
            <p className="eyebrow">Catalog identity</p>
            <h2>Product details</h2>
          </div>
          <span className="required-note">SKU required</span>
        </div>
        <div className="inventory-form-grid">
          <label>
            SKU *
            <input name="sku" required maxLength={255} placeholder="e.g. IP16PM256DT-A" />
          </label>
          <label>
            Manufacturer
            <input name="manufacturer" maxLength={128} placeholder="Apple" />
          </label>
          <label>
            Model
            <input name="model" maxLength={255} placeholder="iPhone 16 Pro Max" />
          </label>
          <label>
            Variant
            <input name="variant" maxLength={255} placeholder="A3295" />
          </label>
          <label>
            Network
            <input name="network" maxLength={128} placeholder="Unlocked" />
          </label>
          <label>
            Capacity
            <input name="capacity" maxLength={128} placeholder="256GB" />
          </label>
          <label>
            Color
            <input name="color" maxLength={128} placeholder="Desert Titanium" />
          </label>
          <label>
            Grade
            <input name="grade" maxLength={64} placeholder="A Grade" />
          </label>
          <label className="wide-field">
            Damages
            <textarea name="damages" maxLength={512} rows={3} placeholder="Optional condition notes" />
          </label>
        </div>
        {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
        <div className="form-actions">
          <Link className="quiet-button" href="/dashboard/inventory">
            Cancel
          </Link>
          <button className="primary-button" type="submit">
            Save SKU
          </button>
        </div>
      </form>
    </WorkspaceShell>
  );
}
