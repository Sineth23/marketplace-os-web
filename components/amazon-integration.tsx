import Link from "next/link";
import type { ReactNode } from "react";
import type { AmazonConnectionStatus, AmazonListing, AmazonSyncRun, InventorySku } from "../lib/api";
import {
  approveAmazonSyncAction,
  connectAmazonAction,
  disconnectAmazonAction,
  mapAmazonListingAction,
  previewAmazonSyncAction,
  refreshAmazonListingsAction,
} from "../app/dashboard/integrations/amazon/actions";

type AmazonTab = "details" | "listings" | "opportunities";
const tabs: ReadonlyArray<{ id: AmazonTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "listings", label: "Listings" },
  { id: "opportunities", label: "Listing Opportunities" },
];

function AmazonTabLink({
  tab,
  current,
  children,
}: {
  tab: AmazonTab;
  current: AmazonTab;
  children: ReactNode;
}) {
  return (
    <Link
      className={current === tab ? "amazon-tab selected" : "amazon-tab"}
      href={`/dashboard/integrations/amazon?tab=${tab}`}
      aria-current={current === tab ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function DetailsView({
  organizationId,
  role,
  amazon,
}: {
  organizationId: string;
  role: string;
  amazon: AmazonConnectionStatus | null;
}) {
  const connected = amazon?.connected ?? false;
  return (
    <div className="amazon-details-grid">
      <section className="amazon-panel amazon-next-step">
        <p className="eyebrow">Amazon Seller Central authorization</p>
        <h2>{connected ? "Seller account connected" : "Connect a seller account"}</h2>
        <p>
          The seller signs in directly on Amazon and grants Marketplace OS access. Marketplace OS never asks
          for or stores an Amazon password. Connection is available only when the backend has the approved app
          configuration.
        </p>
        {amazon?.enabled && !connected ? (
          <form action={connectAmazonAction}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <button className="amazon-primary-link" type="submit">
              Continue to Amazon Seller Central ↗
            </button>
          </form>
        ) : !connected ? (
          <span className="amazon-empty-status">Amazon connection is not enabled on this deployment</span>
        ) : null}
        <div className="amazon-document-note">
          <strong>Before a real seller can connect</strong>
          <ul>
            <li>Amazon developer profile and required Selling Partner API role approved</li>
            <li>Application ID, LWA client credentials, and registered backend callback configured</li>
            <li>Backend deployed with the Amazon connection feature enabled</li>
          </ul>
        </div>
      </section>
      <section className="amazon-panel">
        <div className="amazon-panel-heading">
          <div>
            <p className="eyebrow">Account summary</p>
            <h2>Connection status</h2>
          </div>
          <span className="amazon-state-pill">{connected ? "Connected" : "Not connected"}</span>
        </div>
        <dl className="amazon-account-facts">
          <div>
            <dt>Seller account</dt>
            <dd>{amazon?.sellerId ?? "No seller authorized"}</dd>
          </div>
          <div>
            <dt>Marketplace</dt>
            <dd>{connected ? "Amazon.ca" : "Not selected"}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>{amazon?.environment ?? "Not configured"}</dd>
          </div>
          <div>
            <dt>Connected since</dt>
            <dd>{amazon?.connectedAt ? new Date(amazon.connectedAt).toLocaleString("en-CA") : "—"}</dd>
          </div>
          <div>
            <dt>Quantity updates</dt>
            <dd>{amazon?.writesEnabled ? "Explicit approval enabled" : "Disabled"}</dd>
          </div>
        </dl>
        {connected && role === "owner" && (
          <form action={disconnectAmazonAction}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <button className="amazon-secondary-button" type="submit">
              Disconnect Amazon
            </button>
            <p className="amazon-inline-note">
              This removes the stored Amazon refresh token. An organization owner can connect again later.
            </p>
          </form>
        )}
        <p className="amazon-inline-note">
          Listing reads and inventory changes are tenant-scoped. Marketplace OS inventory is authoritative;
          imported source status remains separately preserved.
        </p>
      </section>
    </div>
  );
}

function ListingsView({
  organizationId,
  amazon,
  listings,
  inventorySkus,
  notice,
}: {
  organizationId: string;
  amazon: AmazonConnectionStatus | null;
  listings: Readonly<{ listings: readonly AmazonListing[]; sandbox: boolean; marketplaceId: string }> | null;
  inventorySkus: readonly InventorySku[];
  notice: string | undefined;
}) {
  if (!amazon?.connected)
    return (
      <EmptyView
        title="No Amazon listings to show"
        text="Connect a seller account before refreshing listings. This view does not substitute sample listings for seller data."
      />
    );
  if (!listings || listings.listings.length === 0)
    return (
      <section className="amazon-empty-panel">
        <span className="amazon-empty-mark" aria-hidden="true">
          A
        </span>
        <p className="eyebrow">Amazon.ca seller data</p>
        <h2>No listing snapshot yet</h2>
        <p>
          Refresh reads the connected account and stores the latest listing status. No mock listings are
          shown.
        </p>
        <form action={refreshAmazonListingsAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <button className="amazon-primary-link" type="submit">
            Refresh Amazon listings
          </button>
        </form>
        {notice && <p className="amazon-inline-note">{notice.replaceAll("_", " ")}</p>}
      </section>
    );
  return (
    <section className="amazon-panel amazon-listing-panel">
      <div className="amazon-panel-heading">
        <div>
          <p className="eyebrow">{listings.sandbox ? "Amazon sandbox sample" : "Amazon.ca seller data"}</p>
          <h2>Listing status</h2>
        </div>
        <form action={refreshAmazonListingsAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <button className="amazon-secondary-button" type="submit">
            Refresh listings
          </button>
        </form>
      </div>
      {notice && <p className="amazon-inline-note">{notice.replaceAll("_", " ")}</p>}
      {listings.listings.length === 0 ? (
        <p>No listings returned for this seller.</p>
      ) : (
        <div className="amazon-table-wrap">
          <table className="amazon-table">
            <thead>
              <tr>
                <th>Seller SKU</th>
                <th>Listing</th>
                <th>Status</th>
                <th>Amazon qty</th>
                <th>Fulfillment</th>
                <th>Marketplace OS SKU mapping</th>
                <th>Issues</th>
                <th>Last observed</th>
              </tr>
            </thead>
            <tbody>
              {listings.listings.map((listing) => (
                <tr key={listing.id}>
                  <td>
                    {listing.sellerSku}
                    <small>{listing.asin ?? "ASIN unavailable"}</small>
                  </td>
                  <td>{listing.title ?? "Untitled listing"}</td>
                  <td>
                    <span className="amazon-state-pill">
                      {listing.isSuppressed
                        ? "Suppressed"
                        : listing.isBuyable
                          ? "Buyable"
                          : listing.listingState.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{listing.amazonQuantity ?? "Unknown"}</td>
                  <td>{listing.fulfillmentChannel ?? "Unknown"}</td>
                  <td>
                    <form action={mapAmazonListingAction} className="amazon-mapping-form">
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <input type="hidden" name="listingId" value={listing.id} />
                      <select
                        name="inventorySkuId"
                        defaultValue={listing.mappedSkuId ?? ""}
                        required
                        aria-label={`Map ${listing.sellerSku} to Marketplace OS SKU`}
                      >
                        <option value="" disabled>
                          Select SKU
                        </option>
                        {inventorySkus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            {sku.sourceSku}
                          </option>
                        ))}
                      </select>
                      <button type="submit">Save</button>
                    </form>
                  </td>
                  <td>{listing.issueCount}</td>
                  <td>{new Date(listing.providerObservedAt).toLocaleString("en-CA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function OpportunitiesView({
  organizationId,
  amazon,
  role,
  run,
  notice,
}: {
  organizationId: string;
  amazon: AmazonConnectionStatus | null;
  role: "owner" | "member";
  run: AmazonSyncRun | null;
  notice: string | undefined;
}) {
  if (!amazon?.connected)
    return (
      <EmptyView
        title="No inventory comparison available"
        text="Connect Amazon and refresh listings before comparing current Amazon quantities with available Marketplace OS units."
      />
    );
  return (
    <section className="amazon-panel amazon-listing-panel">
      <div className="amazon-panel-heading">
        <div>
          <p className="eyebrow">Explicitly approved merchant fulfilled quantity updates</p>
          <h2>Inventory sync preview</h2>
        </div>
        <form action={previewAmazonSyncAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <button className="amazon-primary-link" type="submit">
            Preview inventory sync
          </button>
        </form>
      </div>
      <p className="amazon-inline-note">
        Only units marked available count. Preview does not change Amazon. Amazon quantity reductions that may
        reflect an external sale block increases until inventory is resolved.
      </p>
      {notice && <p className="amazon-inline-note">{notice.replaceAll("_", " ")}</p>}
      {!run ? (
        <p>No sync preview selected. Create a preview to see proposed quantity changes.</p>
      ) : (
        <>
          <p className="amazon-inline-note">
            Preview {run.id} · status: {run.status}
          </p>
          {run.preview.items.length === 0 ? (
            <p>No reviewed mappings with merchant fulfilled quantities were eligible.</p>
          ) : (
            <div className="amazon-table-wrap">
              <table className="amazon-table">
                <thead>
                  <tr>
                    <th>Seller SKU</th>
                    <th>Marketplace OS SKU</th>
                    <th>Amazon quantity</th>
                    <th>Available units</th>
                    <th>Proposed action</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {run.preview.items.map((item) => (
                    <tr key={item.listingId}>
                      <td>{item.sellerSku}</td>
                      <td>{item.inventorySku ?? "Unknown"}</td>
                      <td>{item.currentAmazonQuantity}</td>
                      <td>{item.desiredQuantity}</td>
                      <td>{item.reason.replaceAll("_", " ")}</td>
                      <td>{item.outcome ?? "Awaiting approval"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {run.status === "preview" && role === "owner" && (
            <form action={approveAmazonSyncAction} className="amazon-approval-form">
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="runId" value={run.id} />
              <button className="amazon-primary-link" type="submit" disabled={!amazon.writesEnabled}>
                Approve and submit quantity updates
              </button>
              {!amazon.writesEnabled && <span>Quantity writes are disabled in this deployment.</span>}
            </form>
          )}
        </>
      )}
    </section>
  );
}

function EmptyView({ title, text }: { title: string; text: string }) {
  return (
    <section className="amazon-empty-panel">
      <span className="amazon-empty-mark" aria-hidden="true">
        A
      </span>
      <p className="eyebrow">Amazon seller data</p>
      <h2>{title}</h2>
      <p>{text}</p>
      <span className="amazon-empty-status">No live or sample data</span>
    </section>
  );
}

export function AmazonIntegration({
  tab,
  organizationId,
  organizationRole,
  amazon,
  listings,
  inventorySkus,
  syncRun,
  notice,
}: {
  tab: string | undefined;
  organizationId: string;
  organizationRole: "owner" | "member";
  amazon: AmazonConnectionStatus | null;
  listings: Readonly<{ listings: readonly AmazonListing[]; sandbox: boolean; marketplaceId: string }> | null;
  inventorySkus: readonly InventorySku[];
  syncRun: AmazonSyncRun | null;
  notice: string | undefined;
}) {
  const current: AmazonTab = tab === "listings" || tab === "opportunities" ? tab : "details";
  return (
    <div className="amazon-page">
      <Link className="amazon-back-link" href="/dashboard/integrations">
        ← All integrations
      </Link>
      <section className="amazon-page-intro">
        <div className="amazon-account-identity">
          <span className="amazon-mark" aria-hidden="true">
            a
          </span>
          <div>
            <p className="eyebrow">Marketplace connection</p>
            <h1>Amazon</h1>
            <span>Selling Partner API · Amazon.ca</span>
          </div>
        </div>
        <span className="amazon-status-pill">{amazon?.connected ? "Connected" : "Not connected"}</span>
      </section>
      <section className="amazon-summary" aria-label="Amazon integration status">
        <div>
          <span>Connection</span>
          <strong>{amazon?.connected ? "Connected" : "Not connected"}</strong>
        </div>
        <div>
          <span>Marketplace</span>
          <strong>{amazon?.connected ? "Amazon.ca" : "—"}</strong>
        </div>
        <div>
          <span>Quantity writes</span>
          <strong>{amazon?.writesEnabled ? "Explicit approval" : "Disabled"}</strong>
        </div>
        <p>
          Marketplace OS owns inventory. Amazon listings are refreshed on request, mapped by a reviewer, and
          quantity changes require a separate owner approval.
        </p>
      </section>
      {notice &&
        notice !== "connected" &&
        notice !== "refreshed" &&
        notice !== "mapping_saved" &&
        notice !== "preview_ready" &&
        notice !== "sync_submitted" && (
          <p className="amazon-error-note">Amazon action status: {notice.replaceAll("_", " ")}</p>
        )}
      <nav className="amazon-tabs" aria-label="Amazon integration views">
        {tabs.map((item) => (
          <AmazonTabLink key={item.id} tab={item.id} current={current}>
            {item.label}
          </AmazonTabLink>
        ))}
      </nav>
      {current === "details" ? (
        <DetailsView organizationId={organizationId} role={organizationRole} amazon={amazon} />
      ) : current === "listings" ? (
        <ListingsView
          organizationId={organizationId}
          amazon={amazon}
          listings={listings}
          inventorySkus={inventorySkus}
          notice={notice}
        />
      ) : (
        <OpportunitiesView
          organizationId={organizationId}
          amazon={amazon}
          role={organizationRole}
          run={syncRun}
          notice={notice}
        />
      )}
    </div>
  );
}
