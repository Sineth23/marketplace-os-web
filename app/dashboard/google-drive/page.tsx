import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { DriveSubmit } from "../../../components/drive-submit";
import { BulkSearchRefresh } from "../../../components/bulk-search-refresh";
import {
  driveRequest,
  getGoogleDriveStatus,
  getGoogleDriveBulkSearch,
  getLatestGoogleDriveBulkSearch,
  listOrganizations,
  type DriveBulkSearchJob,
  type DriveSearchResult,
  type DriveSnapshot,
} from "../../../lib/api";
import { session } from "../../../lib/auth";
import { connectGoogleDrive } from "../google-drive-actions";
import {
  selectSource,
  previewSource,
  confirmSnapshot,
  groupSnapshot,
  autoGroupSnapshot,
  searchSkuSnapshot,
  searchEntireDrive,
  searchAllSkus,
  disconnectDrive,
} from "./actions";

const errors: Record<string, string> = {
  source_too_large:
    "This source exceeds the preview limit of 2,000 images or 20 pages. Choose a smaller folder.",
  preview_expired: "This preview expired. Create a new preview before confirming.",
  source_changed: "The source changed. Create a new preview.",
  connection_changed: "The connection or source changed. Create a new preview.",
  search: "Enter an SKU to search across the connected Google Drive.",
  reconnect_required: "Google access has expired or was revoked. Reconnect your account.",
  disconnect:
    "Disconnect could not finish. Access is disabled if cleanup has started; retry disconnect to finish removing the secret.",
  incomplete_search: "Google returned an incomplete listing. Choose a narrower folder and try again.",
  grouping: "The grouping review could not be saved. Refresh and try again.",
  drive_unavailable: "Google Drive could not complete the SKU text search. Try again or use manual review.",
  service_unavailable: "The grouping service was unavailable. Refresh and try again.",
};
export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{
    organizationId?: string;
    parentId?: string;
    pageToken?: string;
    snapshot?: string;
    directSku?: string;
    bulkSearch?: string;
    bulkJobId?: string;
    error?: string;
  }>;
}) {
  if (!(await session())) redirect("/");
  const params = await searchParams;
  const organizations = await listOrganizations();
  const active = params.organizationId
    ? organizations.find((org) => org.id === params.organizationId)
    : organizations[0];
  if (!active) redirect("/dashboard");
  const status = await getGoogleDriveStatus(active.id).catch(() => null);
  const url = (values: Record<string, string> = {}) =>
    `/dashboard/google-drive?${new URLSearchParams({ organizationId: active.id, ...values })}`;
  const fields = <input type="hidden" name="organizationId" value={active.id} />;
  let folders: { folders: { id: string; name: string }[]; nextPageToken: string | null } | null = null;
  let snapshot: DriveSnapshot | null = null;
  let directSearch: DriveSearchResult | null = null;
  let bulkSearch: DriveBulkSearchJob | null = null;
  let loadError = "";
  if (status?.connected) {
    try {
      if (params.directSku) {
        directSearch = await driveRequest<DriveSearchResult>(
          active.id,
          `/search?${new URLSearchParams({ sku: params.directSku })}`,
        );
      }
      bulkSearch = params.bulkJobId
        ? await getGoogleDriveBulkSearch(active.id, params.bulkJobId)
        : await getLatestGoogleDriveBulkSearch(active.id);
      if (params.snapshot)
        snapshot = await driveRequest<DriveSnapshot>(
          active.id,
          `/snapshots/${encodeURIComponent(params.snapshot)}`,
        );
      else
        folders = await driveRequest(
          active.id,
          `/folders?${new URLSearchParams({ ...(params.parentId ? { parentId: params.parentId } : {}), ...(params.pageToken ? { pageToken: params.pageToken } : {}) })}`,
        );
    } catch {
      loadError =
        "Unable to load this folder or preview. Refresh, choose another folder, or reconnect if Google access was revoked.";
    }
  }
  const matchedImageCount = bulkSearch?.matches.reduce((total, match) => total + match.matchCount, 0) ?? 0;
  const bulkStatusLabel =
    bulkSearch?.status === "completed"
      ? "Completed"
      : bulkSearch?.status === "failed"
        ? "Failed"
        : bulkSearch?.status === "queued"
          ? "Queued"
          : "Running";
  return (
    <WorkspaceShell organizationName={active.name} activeSection="overview">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Photo source</p>
          <h1>Google Drive</h1>
          <p>Choose a source, review the image count, then confirm a read-only scan.</p>
        </div>
        <Link href="/dashboard">Back to dashboard</Link>
      </section>
      <nav className="drive-tabs" aria-label="Google Drive workflow">
        <Link className="drive-tab active" href={url()}>
          Drive setup
        </Link>
        <Link
          className="drive-tab"
          href={
            "/dashboard/google-drive/organize?" +
            new URLSearchParams({
              organizationId: active.id,
              ...(snapshot ? { snapshot: snapshot.id } : {}),
            })
          }
        >
          Organize SKUs
        </Link>
      </nav>
      {params.error ? (
        <p className="form-message" role="alert">
          {errors[params.error] ?? "The action could not finish. Refresh and try again."}
        </p>
      ) : null}
      {loadError ? (
        <p className="form-message" role="alert">
          {loadError}
        </p>
      ) : null}
      {!status ? (
        <p role="alert">Connection status is unavailable. Refresh to try again.</p>
      ) : status.connected ? (
        <>
          <section className="setup-panel">
            <h2>Current source: {status.folderId ? "Selected folder" : "Entire Drive"}</h2>
            <p>
              {status.providerAccountEmail
                ? `Connected as ${status.providerAccountEmail}. `
                : "Google Drive is connected. "}
              Your original files are never moved, renamed, or deleted.
            </p>
            {status.folderId ? (
              <p>
                Folder ID: <code>{status.folderId}</code>. Only images directly inside this folder are
                included.
              </p>
            ) : (
              <p>
                Entire Drive includes supported images throughout this account’s accessible Drive corpus,
                including shared items. It is not an exhaustive inventory of shared drives.
              </p>
            )}
            <p>
              Supported formats: JPEG, PNG, WebP, GIF, HEIC, and HEIF. Shortcuts and trashed files are
              excluded. Preview reads metadata only.
            </p>
            <section className="drive-search-panel" aria-labelledby="entire-drive-search-title">
              <h3 id="entire-drive-search-title">Search one SKU across Entire Drive</h3>
              <p>
                This searches Google Drive’s index directly and does not count or preview every image first.
                It searches the entire connected account, even when a folder source is selected.
              </p>
              <form action={searchEntireDrive} className="inventory-search">
                {fields}
                <label className="sr-only" htmlFor="entire-drive-sku">
                  SKU to search for across Entire Drive
                </label>
                <input
                  id="entire-drive-sku"
                  name="sku"
                  defaultValue={params.directSku}
                  placeholder="SKU to search for"
                  required
                />{" "}
                <DriveSubmit pendingText="Searching Entire Drive…">Search Entire Drive</DriveSubmit>
              </form>
              {directSearch ? (
                <div role="status">
                  <p>
                    Found {directSearch.files.length} matching image
                    {directSearch.files.length === 1 ? "" : "s"} for <strong>{directSearch.sku}</strong>.
                  </p>
                  {directSearch.files.length ? (
                    <ul>
                      {directSearch.files.slice(0, 100).map((file) => (
                        <li key={file.id}>
                          {file.name} <small>({file.createdTime})</small>
                        </li>
                      ))}
                      {directSearch.files.length > 100 ? <li>…and more matching images</li> : null}
                    </ul>
                  ) : (
                    <p>No matching image text was found in Entire Drive.</p>
                  )}
                </div>
              ) : null}
              <form action={searchAllSkus} className="inventory-search">
                {fields}
                <DriveSubmit pendingText="Searching all inventory SKUs…">
                  Search all inventory SKUs
                </DriveSubmit>
              </form>
              {bulkSearch ? (
                <div role="status">
                  <div className="bulk-search-status-row">
                    <p className="bulk-search-status">
                      {bulkSearch.status === "completed"
                        ? "The entire Drive search is complete."
                        : bulkSearch.status === "failed"
                          ? "Bulk search failed. Try again or search one SKU."
                          : "The search continues in the background; this table updates automatically."}
                    </p>
                    <BulkSearchRefresh
                      active={bulkSearch.status === "queued" || bulkSearch.status === "running"}
                    />
                  </div>
                  <div className="bulk-search-table-wrap">
                    <table className="bulk-search-summary">
                      <caption>Bulk SKU search progress</caption>
                      <thead>
                        <tr>
                          <th scope="col">Status</th>
                          <th scope="col">SKUs checked</th>
                          <th scope="col">Successful SKUs</th>
                          <th scope="col">Matching images</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{bulkStatusLabel}</td>
                          <td>
                            {bulkSearch.processedSkus} of {bulkSearch.totalSkus}
                          </td>
                          <td>{bulkSearch.matchedSkuCount}</td>
                          <td>{matchedImageCount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="bulk-search-table-wrap">
                    <table className="sku-results-table">
                      <caption>SKU match results</caption>
                      <thead>
                        <tr>
                          <th scope="col">SKU</th>
                          <th scope="col">Result</th>
                          <th scope="col">Images</th>
                          <th scope="col">Files</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkSearch.matches.map((match) => (
                          <tr key={match.sourceSku}>
                            <th scope="row">{match.sourceSku}</th>
                            <td>{match.matchCount ? "Matched" : "No image match"}</td>
                            <td>{match.matchCount}</td>
                            <td>
                              {match.files.length ? (
                                <details>
                                  <summary>Show matching files</summary>
                                  <ul>
                                    {match.files.map((file) => (
                                      <li key={file.id}>{file.name}</li>
                                    ))}
                                  </ul>
                                </details>
                              ) : (
                                <small>None found</small>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </section>
            <form action={previewSource}>
              {fields}
              <DriveSubmit pendingText="Counting images…">Preview image count</DriveSubmit>
            </form>
          </section>
          {snapshot ? (
            <section className="setup-panel" aria-labelledby="preview-title">
              <h2 id="preview-title">
                {snapshot.confirmedAt ? "Scan snapshot saved" : "Review before scanning"}
              </h2>
              <p>
                <strong>
                  {snapshot.count} supported image{snapshot.count === 1 ? "" : "s"}
                </strong>{" "}
                from {snapshot.folderId ? "the selected folder" : "Entire Drive"}.
              </p>
              <p>
                Listed between {snapshot.startedAt} and {snapshot.completedAt}. Ordered by Drive creation
                time, then file ID. This is not camera capture order.
              </p>
              <ul>
                {snapshot.sample.map((file) => (
                  <li key={file.id}>
                    {file.name} <small>({file.mimeType})</small>
                  </li>
                ))}
              </ul>
              {snapshot.confirmedAt ? (
                <>
                  <p role="status">
                    Confirmed at {snapshot.confirmedAt}. The fixed file list is saved and the original Drive
                    files remain untouched.
                  </p>
                  {!snapshot.grouping ? (
                    <>
                      <form action={searchSkuSnapshot}>
                        {fields}
                        <input type="hidden" name="snapshotId" value={snapshot.id} />
                        <p>
                          Search Drive for a specific SKU, like the normal Drive search bar, and group the
                          matching sticker images.
                        </p>
                        <input name="sku" placeholder="SKU to search for" required />{" "}
                        <DriveSubmit pendingText="Searching Drive…">Search Drive for this SKU</DriveSubmit>
                      </form>
                      <form action={autoGroupSnapshot}>
                        {fields}
                        <input type="hidden" name="snapshotId" value={snapshot.id} />
                        <p>
                          Search your inventory SKUs against Google Drive’s indexed text to find likely SKU
                          sticker images automatically. Matches are limited to this snapshot and remain
                          reviewable before you use them.
                        </p>
                        <DriveSubmit pendingText="Searching Drive for SKU stickers…">
                          Find SKU stickers automatically
                        </DriveSubmit>
                      </form>
                      <details>
                        <summary>Use manual review instead</summary>
                        <form action={groupSnapshot}>
                          {fields}
                          <input type="hidden" name="snapshotId" value={snapshot.id} />
                          <p>
                            Mark the images that contain a SKU sticker. A sticker closes the product-photo
                            group immediately before it. Enter the SKU when you can read it.
                          </p>
                          <ul>
                            {snapshot.files.map((file) => (
                              <li key={file.id}>
                                <label>
                                  <input type="checkbox" name={`sticker_${file.id}`} /> {file.name}
                                </label>{" "}
                                <input name={`sku_${file.id}`} placeholder="SKU (optional)" />
                              </li>
                            ))}
                          </ul>
                          <DriveSubmit pendingText="Building groups…">Build photo groups</DriveSubmit>
                        </form>
                      </details>
                    </>
                  ) : (
                    <section aria-labelledby="grouping-title">
                      <h3 id="grouping-title">Photo groups</h3>
                      <form action={searchSkuSnapshot}>
                        {fields}
                        <input type="hidden" name="snapshotId" value={snapshot.id} />
                        <input name="sku" placeholder="Search another SKU" required />{" "}
                        <DriveSubmit pendingText="Searching Drive…">Search and regroup</DriveSubmit>
                      </form>
                      <form action={autoGroupSnapshot}>
                        {fields}
                        <input type="hidden" name="snapshotId" value={snapshot.id} />
                        <DriveSubmit pendingText="Searching Drive for SKU stickers…">
                          Run automatic detection again
                        </DriveSubmit>
                      </form>
                      <p>
                        {snapshot.grouping.groups.length} group
                        {snapshot.grouping.groups.length === 1 ? "" : "s"} created from{" "}
                        {snapshot.grouping.annotatedStickerCount} sticker annotation
                        {snapshot.grouping.annotatedStickerCount === 1 ? "" : "s"}.
                      </p>
                      {snapshot.grouping.annotatedStickerCount === 0 ? (
                        <p role="status">
                          No catalog SKU text matched an image in this snapshot. Make sure your SKUs are
                          imported under Inventory; Drive may also need time to index text in newly added
                          images. Run detection again after importing SKUs, or create a new snapshot.
                        </p>
                      ) : null}
                      <p>
                        {snapshot.grouping.unannotatedFileCount} image
                        {snapshot.grouping.unannotatedFileCount === 1 ? " remains" : "s remain"} outside a
                        detected sticker boundary.
                      </p>
                      <ul>
                        {snapshot.grouping.groups.map((group) => (
                          <li key={group.ordinal}>
                            <strong>Group {group.ordinal}</strong>: {group.productFileIds.length} product
                            photo{group.productFileIds.length === 1 ? "" : "s"};{" "}
                            {group.sourceSku ? `SKU ${group.sourceSku}` : "no SKU"}; {group.status}.{" "}
                            <small>{group.reason}</small>
                          </li>
                        ))}
                      </ul>
                      <details>
                        <summary>Review sticker files manually</summary>
                        <form action={groupSnapshot}>
                          {fields}
                          <input type="hidden" name="snapshotId" value={snapshot.id} />
                          <p>Mark sticker images and enter a SKU when Drive text search needs help.</p>
                          <ul>
                            {snapshot.files.map((file) => (
                              <li key={file.id}>
                                <label>
                                  <input type="checkbox" name={`sticker_${file.id}`} /> {file.name}
                                </label>{" "}
                                <input name={`sku_${file.id}`} placeholder="SKU (optional)" />
                              </li>
                            ))}
                          </ul>
                          <DriveSubmit pendingText="Building groups…">
                            Build photo groups manually
                          </DriveSubmit>
                        </form>
                      </details>
                    </section>
                  )}
                </>
              ) : (
                <form action={confirmSnapshot}>
                  {fields}
                  <input type="hidden" name="snapshotId" value={snapshot.id} />
                  <p>
                    <label>
                      <input type="checkbox" name="confirmed" required /> I confirm scanning these{" "}
                      {snapshot.count} images from {snapshot.folderId ? "this folder" : "Entire Drive"}.
                    </label>
                  </p>
                  <p>
                    This preview expires at {snapshot.expiresAt}. Confirmation saves exactly this file list,
                    even if Drive changes afterward.
                  </p>
                  <DriveSubmit>Confirm read-only scan</DriveSubmit>
                </form>
              )}
              <p>
                <Link href={url()}>Choose a different source</Link>
              </p>
            </section>
          ) : (
            <section className="setup-panel" aria-labelledby="folders-title">
              <h2 id="folders-title">Choose a source</h2>
              <form action={selectSource}>
                {fields}
                <input type="hidden" name="folderId" value="" />
                <DriveSubmit>Use Entire Drive</DriveSubmit>
              </form>
              <p>
                {params.parentId
                  ? "Subfolders of the selected browsing folder."
                  : "Folders accessible to this Google account."}{" "}
                Folder sources include direct children only.
              </p>
              {params.parentId ? (
                <p>
                  <Link href={url()}>All folders</Link>
                </p>
              ) : null}
              <ul>
                {folders?.folders.map((folder) => (
                  <li key={folder.id}>
                    <strong>{folder.name}</strong>{" "}
                    <Link href={url({ parentId: folder.id })}>Browse subfolders</Link>
                    <form action={selectSource}>
                      {fields}
                      <input type="hidden" name="folderId" value={folder.id} />
                      <DriveSubmit>Use this folder</DriveSubmit>
                    </form>
                  </li>
                ))}
              </ul>
              {folders && !folders.folders.length ? (
                <p>No folders found here. You can choose Entire Drive or return to all folders.</p>
              ) : null}
              {folders?.nextPageToken ? (
                <Link
                  href={url({
                    ...(params.parentId ? { parentId: params.parentId } : {}),
                    pageToken: folders.nextPageToken,
                  })}
                >
                  Next folders
                </Link>
              ) : null}
            </section>
          )}
        </>
      ) : status.disconnectPending ? (
        <p role="status">
          The connection is disabled. Retry disconnect below to finish removing its stored credentials.
        </p>
      ) : (
        <section className="setup-panel">
          <h2>Connect an account</h2>
          <p>Google will ask you to choose an account and grant read-only access.</p>
          {active.role === "owner" ? (
            <form action={connectGoogleDrive}>
              {fields}
              <DriveSubmit>Connect Google Drive</DriveSubmit>
            </form>
          ) : (
            <p>Ask the workspace owner to connect an account.</p>
          )}
        </section>
      )}
      {status && (status.connected || status.disconnectPending) && active.role === "owner" ? (
        <section className="setup-panel">
          <h2>Account connection</h2>
          <p>
            Disconnect removes the saved Google credentials. Existing snapshot metadata stays in this
            workspace.
          </p>
          <form action={disconnectDrive}>
            {fields}
            <p>
              <label>
                <input type="checkbox" name="confirmed" required /> Remove this workspace’s Google Drive
                connection.
              </label>
            </p>
            <p>
              <label>
                <input type="checkbox" name="reconnect" value="yes" /> Reconnect afterward to choose a
                different Google account.
              </label>
            </p>
            <DriveSubmit>Disconnect</DriveSubmit>
          </form>
        </section>
      ) : null}
    </WorkspaceShell>
  );
}
