import { redirect } from "next/navigation";

import { InventoryImportForm } from "../../components/inventory-import-form";
import { WorkspaceShell } from "../../components/workspace-shell";
import { listOrganizations } from "../../lib/api";
import { session } from "../../lib/auth";
import { createOrganizationAction } from "./actions";

export default async function DashboardPage() {
  if (!(await session())) redirect("/");
  let organizations;
  try {
    organizations = await listOrganizations();
  } catch {
    redirect("/?signIn=expired");
  }

  const activeOrganization = organizations[0];
  return (
    <WorkspaceShell organizationName={activeOrganization?.name}>
      {activeOrganization ? (
        <>
          <section className="dashboard-intro" aria-labelledby="workspace-title">
            <div>
              <p className="eyebrow">{activeOrganization.role} workspace</p>
              <h1 id="workspace-title">{activeOrganization.name}</h1>
              <p>
                Set up the catalog first. It gives the photo workflow the SKU records it needs to match later.
              </p>
            </div>
            <form action="/api/auth/sign-out" method="post">
              <button className="quiet-button" type="submit">
                Sign out
              </button>
            </form>
          </section>

          <section className="setup-panel" aria-labelledby="setup-title">
            <div className="setup-panel-heading">
              <div>
                <p className="eyebrow">Getting ready</p>
                <h2 id="setup-title">Start with your inventory</h2>
              </div>
              <span className="progress-label">1 of 3 steps</span>
            </div>
            <ol className="setup-steps">
              <li className="complete">
                <span>✓</span>
                <div>
                  <strong>Workspace created</strong>
                  <small>{activeOrganization.name} is ready for your team.</small>
                </div>
              </li>
              <li className="current">
                <span>2</span>
                <div>
                  <strong>Import inventory</strong>
                  <small>Upload the SKU catalog you shared with us.</small>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Connect photo source</strong>
                  <small>Google Drive begins after the catalog is confirmed.</small>
                </div>
              </li>
            </ol>
          </section>

          <section className="inventory-import-card" id="inventory" aria-labelledby="inventory-import-title">
            <div className="inventory-import-copy">
              <span className="section-icon" aria-hidden="true">
                ▦
              </span>
              <p className="eyebrow">Inventory catalog</p>
              <h2 id="inventory-import-title">Bring in the SKUs your photos will match.</h2>
              <p>
                Import a WholeCell-style inventory CSV. We keep the catalog fields needed for matching and
                leave serial numbers, status, pricing, and other operational fields out.
              </p>
              <ul className="import-field-list">
                <li>SKU</li>
                <li>Manufacturer and model</li>
                <li>Variant, network, capacity, and color</li>
                <li>Grade and damages</li>
              </ul>
            </div>
            <InventoryImportForm organizationId={activeOrganization.id} />
          </section>

          {organizations.length > 1 ? (
            <section className="organization-list" aria-labelledby="organizations-title">
              <p className="eyebrow">Your organizations</p>
              <h2 id="organizations-title">Available workspaces</h2>
              <ul>
                {organizations.map((organization) => (
                  <li key={organization.id}>
                    <strong>{organization.name}</strong>
                    <span>{organization.role}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <section className="empty-workspace" aria-labelledby="create-title">
          <p className="eyebrow">Set up your first workspace</p>
          <h1 id="create-title">Create the client organization you are onboarding.</h1>
          <p>
            Each organization keeps its inventory and future photo workflow separate from every other client.
          </p>
          <form className="create-organization-form" action={createOrganizationAction}>
            <label htmlFor="name">Organization name</label>
            <div>
              <input id="name" name="name" required maxLength={160} placeholder="e.g. Device Mart" />
              <button className="primary-button" type="submit">
                Create workspace
              </button>
            </div>
          </form>
          <form action="/api/auth/sign-out" method="post">
            <button className="quiet-button" type="submit">
              Sign out
            </button>
          </form>
        </section>
      )}
    </WorkspaceShell>
  );
}
