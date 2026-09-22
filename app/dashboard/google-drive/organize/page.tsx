import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { DriveSubmit } from "../../../../components/drive-submit";
import {
  driveRequest,
  getGoogleDriveStatus,
  listInventory,
  listOrganizations,
  type DriveSnapshot,
  type InventorySku,
} from "../../../../lib/api";
import { session } from "../../../../lib/auth";
import { autoGroupSnapshot, searchSkuSnapshot } from "../actions";

function normalizeSku(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export default async function GoogleDriveOrganizePage({
  searchParams,
}: {
  searchParams: Promise<{
    organizationId?: string;
    snapshot?: string;
    focusSku?: string;
  }>;
}) {
  if (!(await session())) redirect("/");
  const params = await searchParams;
  const organizations = await listOrganizations();
  const active = params.organizationId
    ? organizations.find((organization) => organization.id === params.organizationId)
    : organizations[0];
  if (!active) redirect("/dashboard");

  const status = await getGoogleDriveStatus(active.id).catch(() => null);
  let snapshot: DriveSnapshot | null = null;
  let inventory: readonly InventorySku[] = [];
  let loadError = "";
  if (params.snapshot) {
    try {
      snapshot = await driveRequest<DriveSnapshot>(
        active.id,
        "/snapshots/" + encodeURIComponent(params.snapshot),
      );
    } catch {
      loadError = "This scan snapshot could not be loaded. Return to setup and create a new snapshot.";
    }
  }
  try {
    inventory = (await listInventory(active.id, 1, "")).items;
  } catch {
    loadError = "The inventory could not be loaded. Import your SKU list, then refresh this tab.";
  }

  const setupHref =
    "/dashboard/google-drive?organizationId=" +
    encodeURIComponent(active.id) +
    (snapshot ? "&snapshot=" + encodeURIComponent(snapshot.id) : "");
  const organizeHref =
    "/dashboard/google-drive/organize?organizationId=" +
    encodeURIComponent(active.id) +
    (snapshot ? "&snapshot=" + encodeURIComponent(snapshot.id) : "");
  const fields = (
    <>
      <input type="hidden" name="organizationId" value={active.id} />
      {snapshot ? <input type="hidden" name="snapshotId" value={snapshot.id} /> : null}
      <input type="hidden" name="view" value="organize" />
    </>
  );
  const focus = params.focusSku ? normalizeSku(params.focusSku) : "";
  const filesById = new Map(snapshot?.files.map((file) => [file.id, file.name]) ?? []);
  const visibleGroups = snapshot?.grouping?.groups.filter(
    (group) => !focus || (group.sourceSku && normalizeSku(group.sourceSku) === focus),
  );

  return (
    <WorkspaceShell organizationName={active.name} activeSection="overview">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Photo source</p>
          <h1>Organize SKUs</h1>
          <p>
            Choose one inventory SKU, find its Drive sticker, and review the photos between sticker
            boundaries.
          </p>
        </div>
        <Link href="/dashboard">Back to dashboard</Link>
      </section>

      <nav className="drive-tabs" aria-label="Google Drive workflow">
        <Link className="drive-tab" href={setupHref}>
          Drive setup
        </Link>
        <Link className="drive-tab active" href={organizeHref} aria-current="page">
          Organize SKUs
        </Link>
      </nav>

      {loadError ? (
        <p className="form-message" role="alert">
          {loadError}
        </p>
      ) : null}

      {!status?.connected ? (
        <section className="setup-panel">
          <h2>Connect Google Drive first</h2>
          <p>Connect the client account and create a confirmed read-only scan before organizing SKUs.</p>
          <Link className="primary-link" href={setupHref}>
            Open Drive setup
          </Link>
        </section>
      ) : !snapshot ? (
        <section className="setup-panel">
          <h2>Create a scan snapshot</h2>
          <p>
            The organizer works from a fixed snapshot so new Drive uploads cannot silently change the results.
          </p>
          <Link className="primary-link" href={setupHref}>
            Choose a source and scan images
          </Link>
        </section>
      ) : (
        <>
          <section className="setup-panel">
            <div className="setup-panel-heading">
              <div>
                <p className="eyebrow">Step 1</p>
                <h2>Select a SKU</h2>
              </div>
              <span className="progress-label">{snapshot.count} images in snapshot</span>
            </div>
            <p>
              Searching one SKU still detects the other catalog stickers so the selected group stops at the
              correct boundary. Original Drive files are never moved, renamed, or deleted.
            </p>
            <form action={searchSkuSnapshot} className="inventory-search">
              {fields}
              <label className="sr-only" htmlFor="sku-search">
                SKU to search for
              </label>
              <input id="sku-search" name="sku" placeholder="Search by SKU" required />
              <DriveSubmit pendingText="Searching Drive…">Find SKU photos</DriveSubmit>
            </form>
            {inventory.length ? (
              <div className="sku-picker" aria-label="Inventory SKUs">
                {inventory.map((item) => (
                  <form key={item.id} action={searchSkuSnapshot} className="sku-picker-item">
                    {fields}
                    <input type="hidden" name="sku" value={item.sourceSku} />
                    <span>
                      <strong>{item.sourceSku}</strong>
                      {item.manufacturer || item.model ? (
                        <small>{[item.manufacturer, item.model].filter(Boolean).join(" ")}</small>
                      ) : null}
                    </span>
                    <DriveSubmit pendingText="Searching…">Find photos</DriveSubmit>
                  </form>
                ))}
              </div>
            ) : (
              <p>No inventory SKUs are available yet. Import the client’s inventory first.</p>
            )}
          </section>

          <section className="setup-panel" aria-labelledby="results-title">
            <div className="setup-panel-heading">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2 id="results-title">Review results</h2>
              </div>
              {focus ? <span className="progress-label">Showing {params.focusSku}</span> : null}
            </div>
            {!snapshot.grouping ? (
              <>
                <p>Run automatic detection once to identify all sticker boundaries in this snapshot.</p>
                <form action={autoGroupSnapshot}>
                  {fields}
                  <DriveSubmit pendingText="Finding sticker boundaries…">
                    Find all sticker boundaries
                  </DriveSubmit>
                </form>
              </>
            ) : (
              <>
                <p>
                  {snapshot.grouping.annotatedStickerCount} sticker boundary
                  {snapshot.grouping.annotatedStickerCount === 1 ? " was" : "s were"} detected.{" "}
                  {snapshot.grouping.unannotatedFileCount} image
                  {snapshot.grouping.unannotatedFileCount === 1 ? " remains" : "s remain"} outside a detected
                  boundary.
                </p>
                {visibleGroups?.length ? (
                  <ul className="sku-results">
                    {visibleGroups.map((group) => (
                      <li key={group.ordinal}>
                        <div>
                          <strong>{group.sourceSku ?? "Needs review"}</strong>
                          <span>
                            {group.productFileIds.length} product photo
                            {group.productFileIds.length === 1 ? "" : "s"} · {group.status}
                          </span>
                        </div>
                        <small>{group.reason}</small>
                        <ul>
                          {group.productFileIds.slice(0, 12).map((fileId) => (
                            <li key={fileId}>{filesById.get(fileId) ?? fileId}</li>
                          ))}
                          {group.productFileIds.length > 12 ? <li>…and more</li> : null}
                        </ul>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p role="status">No group matched this SKU in the current snapshot.</p>
                )}
                {focus ? <Link href={organizeHref}>Show all detected groups</Link> : null}
                <form action={autoGroupSnapshot}>
                  {fields}
                  <DriveSubmit pendingText="Finding sticker boundaries…">Run detection again</DriveSubmit>
                </form>
              </>
            )}
          </section>
        </>
      )}
    </WorkspaceShell>
  );
}
