import { redirect } from "next/navigation";

import { InventoryImportForm } from "../../components/inventory-import-form";
import { WorkspaceShell } from "../../components/workspace-shell";
import { getGoogleDriveStatus, getInventoryPreview, listOrganizations } from "../../lib/api";
import { session } from "../../lib/auth";
import { createOrganizationAction } from "./actions";
import { connectGoogleDrive } from "./google-drive-actions";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ googleDrive?: string; reviewBatch?: string }>;
}) {
  if (!(await session())) redirect("/");
  const params = await searchParams;
  let organizations;
  try {
    organizations = await listOrganizations();
  } catch {
    redirect("/?signIn=expired");
  }

  const activeOrganization = organizations[0];
  const initialInventoryBatch =
    activeOrganization && params.reviewBatch
      ? await getInventoryPreview(activeOrganization.id, params.reviewBatch).catch(() => null)
      : null;
  const driveStatus = activeOrganization
    ? await getGoogleDriveStatus(activeOrganization.id).catch(() => null)
    : null;
  return (
    <WorkspaceShell organizationName={activeOrganization?.name} activeSection="overview">
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
                  <small>Connect Google Drive when your catalog is ready.</small>
                </div>
              </li>
            </ol>
          </section>

          {params.googleDrive === "connected" || params.googleDrive === "source-saved" ? (
            <p className="form-message success" role="status">
              Google Drive is connected. Choose a photo source and preview the image count.
            </p>
          ) : params.googleDrive === "disconnect_pending" ? (
            <p className="form-message" role="status">
              Google Drive is still disconnecting. Open the source manager and retry the disconnect before
              reconnecting.
            </p>
          ) : params.googleDrive === "already_connected" ? (
            <p className="form-message" role="status">
              Google Drive is already connected to this workspace. Disconnect it first to choose another
              account.
            </p>
          ) : null}

          <section className="integration-card" aria-labelledby="google-drive-title">
            <div>
              <p className="eyebrow">Photo source</p>
              <h2 id="google-drive-title">
                {driveStatus?.connected ? "Google Drive connected" : "Connect Google Drive"}
              </h2>
              <p>
                {driveStatus?.connected
                  ? driveStatus.providerAccountEmail
                    ? `Connected as ${driveStatus.providerAccountEmail}.`
                    : "Your Google Drive connection is active."
                  : "Give Marketplace OS read-only access to the product photos you want to organize."}{" "}
                Your Drive files stay in Google Drive—we only use them to build the photo workflow.
              </p>
            </div>
            {driveStatus?.connected || driveStatus?.disconnectPending ? (
              <div>
                <p className="eyebrow">Photo source</p>
                <strong>{driveStatus.folderId ? "Selected folder" : "Entire Drive"}</strong>
                <p>
                  <Link
                    className="quiet-button"
                    href={`/dashboard/google-drive?organizationId=${activeOrganization.id}`}
                  >
                    Manage source and scan
                  </Link>
                </p>
                <small>Browse folders or use Entire Drive, review the image count, then confirm.</small>
              </div>
            ) : (
              <form action={connectGoogleDrive}>
                <input type="hidden" name="organizationId" value={activeOrganization.id} />
                <button className="primary-button" type="submit">
                  Connect Google Drive
                </button>
              </form>
            )}
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
            <InventoryImportForm
              organizationId={activeOrganization.id}
              initialBatch={initialInventoryBatch}
            />
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
