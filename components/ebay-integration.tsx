import Link from "next/link";
import type { ReactNode } from "react";
import type { EbayConnectionStatus, EbayListing, InventorySku } from "../lib/api";
import { connectEbay } from "../app/dashboard/ebay-actions";

type Tab = "details" | "listings" | "opportunities";
type InventorySummary = Readonly<{ skuCount: number; unitCount: number }>;

function activeTab(value: string | undefined): Tab {
  if (value === "listings" || value === "opportunities") return value;
  return "details";
}

function TabLink({
  tab,
  current,
  organizationId,
  children,
}: {
  tab: Tab;
  current: Tab;
  organizationId: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={`ebay-tab ${current === tab ? "selected" : ""}`}
      href={`/dashboard/integrations/ebay?${new URLSearchParams({ tab, organizationId })}`}
      aria-current={current === tab ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function Setting({ label, value = "Not configured" }: { label: string; value?: string }) {
  return (
    <label className="ebay-setting">
      <span>{label}</span>
      <select defaultValue="" disabled aria-label={`${label}: ${value}`}>
        <option value="">{value}</option>
      </select>
    </label>
  );
}

function DetailsView({
  status,
  organizationId,
}: {
  status: EbayConnectionStatus | null;
  organizationId: string;
}) {
  return (
    <div className="ebay-details-grid">
      <section className="ebay-config-card" aria-labelledby="ebay-connection-title">
        <div className="ebay-section-heading">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id="ebay-connection-title">Connection details</h2>
          </div>
          <span className="ebay-status">{status?.connected ? "Connected" : "Not connected"}</span>
        </div>
        <dl className="ebay-connection-facts">
          <div>
            <dt>Organization type</dt>
            <dd>Not configured</dd>
          </div>
          <div>
            <dt>Channel type</dt>
            <dd>Not configured</dd>
          </div>
          <div>
            <dt>eBay account</dt>
            <dd>{status?.connected ? status.ebayUsername : "No account linked"}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>{status?.environment ?? "Not configured"}</dd>
          </div>
        </dl>
        {!status?.connected ? (
          <form action={connectEbay}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <button className="primary-button" type="submit">
              Connect eBay account
            </button>
            <p className="ebay-preview-note">
              Only this organization’s owner can connect its seller account.
            </p>
          </form>
        ) : null}
      </section>

      <section className="ebay-config-card" aria-labelledby="ebay-orders-title">
        <div className="ebay-section-heading">
          <div>
            <p className="eyebrow">Orders</p>
            <h2 id="ebay-orders-title">Order import and status mapping</h2>
          </div>
        </div>
        <p className="ebay-preview-note">
          Preview only. Order import is unavailable until an eBay connection is designed and authorized.
        </p>
        <Setting label="Order import" />
        <div className="ebay-settings-grid">
          <Setting label="Unpaid order status" />
          <Setting label="Paid order status" />
          <Setting label="Shipped order status" />
          <Setting label="Cancelled order status" />
        </div>
      </section>

      <section className="ebay-config-card" aria-labelledby="ebay-stock-title">
        <div className="ebay-section-heading">
          <div>
            <p className="eyebrow">Inventory</p>
            <h2 id="ebay-stock-title">Stock-level sync</h2>
          </div>
        </div>
        <p className="ebay-preview-note">
          WholeCell remains authoritative. No stock is sent to or read from eBay.
        </p>
        <Setting label="Stock-level synchronization" />
        <div className="ebay-settings-grid">
          <Setting label="Inventory statuses" />
          <Setting label="Warehouse scope" />
        </div>
      </section>

      <section className="ebay-config-card" aria-labelledby="ebay-automation-title">
        <div className="ebay-section-heading">
          <div>
            <p className="eyebrow">Automation</p>
            <h2 id="ebay-automation-title">Listing behavior</h2>
          </div>
        </div>
        <p className="ebay-preview-note">No automation is active or configured in this preview.</p>
        <div className="ebay-settings-grid">
          <Setting label="Auto-commit" />
          <Setting label="Auto-connect relisted listings" />
          <Setting label="Automatic listing import" />
        </div>
      </section>
    </div>
  );
}

function ListingsView({
  listings,
  error,
  truncated,
  connected,
  inventoryItems,
  unitQuantities,
  fetchedAt,
  filters,
  organizationId,
}: {
  listings: readonly EbayListing[];
  error: string | null;
  truncated: boolean;
  inventoryItems: readonly InventorySku[];
  filters: {
    q?: string | undefined;
    listingStatus?: string | undefined;
    connectionStatus?: string | undefined;
    connectionType?: string | undefined;
  };
  organizationId: string;
  unitQuantities: Readonly<Record<string, number>>;
  fetchedAt: string | null;
  connected: boolean;
}) {
  const inventoryBySku = new Map(inventoryItems.map((item) => [item.sourceSku.toLowerCase(), item]));
  return (
    <section className="ebay-data-panel" aria-labelledby="ebay-listings-title">
      <div className="ebay-section-heading">
        <div>
          <p className="eyebrow">eBay seller account · Live read</p>
          <h2 id="ebay-listings-title">Linked Listings</h2>
        </div>
        <a
          className="ebay-secondary-button"
          href={`?${new URLSearchParams({ tab: "listings", organizationId })}`}
        >
          Refresh
        </a>
      </div>
      <p className="ebay-preview-note">
        Read-only records managed through eBay’s Inventory API. This is not a complete Seller Hub listing
        export.
      </p>
      <form className="ebay-filter-panel" method="get">
        <input type="hidden" name="tab" value="listings" />
        <input type="hidden" name="organizationId" value={organizationId} />
        <label>
          Search
          <input name="q" placeholder="Title, listing ID, or SKU" defaultValue={filters.q} />
        </label>
        <label>
          Listing status
          <select name="listingStatus" defaultValue={filters.listingStatus ?? "All"}>
            <option>All</option>
            <option>Active</option>
            <option>Error</option>
            <option>Ended</option>
          </select>
        </label>
        <label>
          Product connection status
          <select name="connectionStatus" defaultValue={filters.connectionStatus ?? "All"}>
            <option>All</option>
            <option>Connected</option>
            <option>Not Connected</option>
          </select>
        </label>
        <label>
          Product connection type
          <select name="connectionType" defaultValue={filters.connectionType ?? "All"}>
            <option>All</option>
            <option>SKU</option>
            <option>Specific Product Variations</option>
            <option>Inventory</option>
          </select>
        </label>
        <label>
          SKU changed since import
          <select
            name="skuChanged"
            defaultValue="Unknown"
            disabled
            aria-label="SKU changed since import unavailable: no listing snapshot has been imported"
          >
            <option>All</option>
            <option>Unknown</option>
          </select>
        </label>
        <button className="primary-button" type="submit">
          Apply filters
        </button>
      </form>
      <div className="ebay-table-wrap">
        <table className="ebay-table">
          <thead>
            <tr>
              <th>Connection</th>
              <th>Listing status</th>
              <th>Title</th>
              <th>Listing ID</th>
              <th>Type</th>
              <th>SKU</th>
              <th>Channel quantity</th>
              <th>WholeCell quantity</th>
              <th>Import time</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={9} className="ebay-empty-cell">
                  <strong>Listings could not be loaded</strong>
                  <span>
                    {error === "reconnect_required"
                      ? "eBay authorization has expired or been revoked. Ask an organization owner to reconnect."
                      : "eBay listing data is temporarily unavailable. Retry the read."}
                  </span>
                </td>
              </tr>
            ) : listings.length ? (
              listings.map((listing, index) => {
                const wholeCell = inventoryBySku.get(listing.sku.toLowerCase());
                return (
                  <tr key={`${listing.sku}-${listing.listingId ?? index}`}>
                    <td>{wholeCell ? "Connected by exact SKU" : "Not connected"}</td>
                    <td>{listing.listingStatus}</td>
                    <td>{listing.title}</td>
                    <td>{listing.listingId ?? "—"}</td>
                    <td>{listing.connectionType}</td>
                    <td>{listing.sku}</td>
                    <td>{listing.channelQuantity ?? "—"}</td>
                    <td>
                      {wholeCell ? (unitQuantities[wholeCell.sourceSku.toLowerCase()] ?? 0) : "Not matched"}
                    </td>
                    <td>{fetchedAt ? `Live read · ${new Date(fetchedAt).toLocaleString()}` : "—"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="ebay-empty-cell">
                  <strong>
                    {connected
                      ? "No Inventory API listing records found"
                      : "Connect an eBay seller account to view listings"}
                  </strong>
                  <span>
                    {connected
                      ? "This eBay account returned no Inventory API items/offers. Seller Hub or Trading API listings may not be represented here."
                      : "No provider listing state is inferred before the seller account is authorized."}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="ebay-preview-note">Showing a bounded subset of the account’s Inventory API records.</p>
      ) : null}
    </section>
  );
}

function OpportunitiesView({
  inventoryItems,
  listings,
  unitQuantities,
  canCompare,
}: {
  inventoryItems: readonly InventorySku[];
  listings: readonly EbayListing[];
  unitQuantities: Readonly<Record<string, number>>;
  canCompare: boolean;
}) {
  const ebaySkus = new Set(listings.map((listing) => listing.sku.toLowerCase()));
  const candidates = canCompare
    ? inventoryItems.filter((item) => !ebaySkus.has(item.sourceSku.toLowerCase()))
    : [];
  return (
    <section className="ebay-data-panel" aria-labelledby="ebay-opportunities-title">
      <div className="ebay-section-heading">
        <div>
          <p className="eyebrow">eBay account · Preview</p>
          <h2 id="ebay-opportunities-title">Listing Opportunities</h2>
        </div>
      </div>
      <p className="ebay-preview-note">
        Potential unlinked WholeCell catalog SKUs, matched by exact SKU. These are not eBay eligibility
        decisions and no listings are created.
      </p>
      <div className="ebay-table-wrap">
        <table className="ebay-table ebay-opportunities-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Grade</th>
              <th>Conditions</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length ? (
              candidates.map((item) => (
                <tr key={item.id}>
                  <td>{item.sourceSku}</td>
                  <td>{[item.manufacturer, item.model, item.variant].filter(Boolean).join(" ") || "—"}</td>
                  <td>{item.grade ?? "—"}</td>
                  <td>{item.damages ?? "—"}</td>
                  <td>{unitQuantities[item.sourceSku] ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="ebay-empty-cell">
                  <strong>
                    {!canCompare
                      ? "A complete connected listing read is required"
                      : inventoryItems.length
                        ? "No unlinked WholeCell SKUs in the loaded data"
                        : "No WholeCell inventory available"}
                  </strong>
                  <span>
                    Only exact SKU matching is used. A partial/error response does not generate opportunity
                    candidates, and this view does not determine listing eligibility.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EbayIntegration({
  tab: requestedTab,
  organizationId,
  organizationName,
  inventorySummary,
  status,
  statusError,
  listings,
  listingsError,
  listingsTruncated,
  inventoryItems,
  unitQuantities,
  callbackStatus,
  filters,
  catalogTruncated,
  unitsTruncated,
  listingsFetchedAt,
}: {
  tab?: string | undefined;
  organizationId: string;
  organizationName: string;
  inventorySummary: InventorySummary | null;
  status: EbayConnectionStatus | null;
  statusError: string | null;
  listings: readonly EbayListing[];
  listingsError: string | null;
  listingsTruncated: boolean;
  inventoryItems: readonly InventorySku[];
  unitQuantities: Readonly<Record<string, number>>;
  callbackStatus?: string | undefined;
  filters: {
    q?: string | undefined;
    listingStatus?: string | undefined;
    connectionStatus?: string | undefined;
    connectionType?: string | undefined;
  };
  catalogTruncated: boolean;
  unitsTruncated: boolean;
  listingsFetchedAt: string | null;
}) {
  const tab = activeTab(requestedTab);
  const filteredListings = listings.filter((listing) => {
    const query = filters.q?.trim().toLowerCase();
    const workspaceConnected = inventoryItems.some(
      (item) => item.sourceSku.toLowerCase() === listing.sku.toLowerCase(),
    );
    return (
      (!query ||
        `${listing.title} ${listing.listingId ?? ""} ${listing.sku}`.toLowerCase().includes(query)) &&
      (!filters.listingStatus ||
        filters.listingStatus === "All" ||
        listing.listingStatus.toLowerCase().includes(filters.listingStatus.toLowerCase())) &&
      (!filters.connectionStatus ||
        filters.connectionStatus === "All" ||
        (workspaceConnected ? "Connected" : "Not Connected") === filters.connectionStatus) &&
      (!filters.connectionType || filters.connectionType === "All" || filters.connectionType === "SKU")
    );
  });
  return (
    <div className="ebay-page">
      <section className="dashboard-intro ebay-page-intro">
        <div>
          <Link className="ebay-back-link" href="/dashboard/integrations">
            ← All integrations
          </Link>
          <p className="eyebrow">Marketplace integration</p>
          <h1>eBay Integration</h1>
          <p>
            WholeCell remains the source of truth. eBay access is read-only and limited to Inventory
            API-managed records.
          </p>
        </div>
      </section>

      <section className="ebay-account-summary" aria-labelledby="ebay-account-title">
        <div className="ebay-account-identity">
          <span className="ebay-mark" aria-hidden="true">
            e
          </span>
          <div>
            <p className="eyebrow">Account summary · {status?.connected ? "Connected" : "Not connected"}</p>
            <h2 id="ebay-account-title">{organizationName}</h2>
            <span>{status?.connected ? status.ebayUsername : "No eBay account connected"}</span>
          </div>
        </div>
        <span className="ebay-status">
          {status?.connected ? "Connected" : statusError ? "Status unavailable" : "Not connected"}
        </span>
        <div className="ebay-summary-metrics">
          <div>
            <span>Authentication</span>
            <strong>{status?.connected ? "Authorized" : "Not connected"}</strong>
          </div>
          <div>
            <span>Order import</span>
            <strong>Unavailable</strong>
          </div>
          <div>
            <span>Inventory sync</span>
            <strong>Not configured</strong>
          </div>
          <div>
            <span>Listing import</span>
            <strong>{status?.connected ? "Inventory API" : "Not connected"}</strong>
          </div>
          <div>
            <span>WholeCell catalog SKUs</span>
            <strong>{inventorySummary ? inventorySummary.skuCount.toLocaleString() : "Unavailable"}</strong>
          </div>
          <div>
            <span>WholeCell inventory units</span>
            <strong>{inventorySummary ? inventorySummary.unitCount.toLocaleString() : "Unavailable"}</strong>
          </div>
        </div>
        <small className="ebay-summary-footnote">
          WholeCell counts come from the authenticated {organizationName} workspace.{" "}
          {status?.connected
            ? `eBay ${status.environment} account data is connected.`
            : "No eBay seller data is available."}
        </small>
        {callbackStatus === "connected" ? (
          <p className="ebay-success-note">eBay account connected. Seller data is read on this page.</p>
        ) : null}
        {callbackStatus === "declined" ? (
          <p className="ebay-preview-note">eBay authorization was declined.</p>
        ) : null}
      </section>

      <nav className="ebay-tabs" aria-label="eBay integration views">
        <TabLink tab="details" current={tab} organizationId={organizationId}>
          Details
        </TabLink>
        <TabLink tab="listings" current={tab} organizationId={organizationId}>
          Listings
        </TabLink>
        <TabLink tab="opportunities" current={tab} organizationId={organizationId}>
          Listing Opportunities
        </TabLink>
      </nav>

      {tab === "details" ? (
        <DetailsView status={status} organizationId={organizationId} />
      ) : tab === "listings" ? (
        <ListingsView
          listings={filteredListings}
          error={listingsError}
          truncated={listingsTruncated}
          connected={!!status?.connected}
          inventoryItems={inventoryItems}
          unitQuantities={unitQuantities}
          fetchedAt={listingsFetchedAt}
          filters={filters}
          organizationId={organizationId}
        />
      ) : (
        <OpportunitiesView
          inventoryItems={inventoryItems}
          listings={listings}
          unitQuantities={unitQuantities}
          canCompare={!!status?.connected && !listingsError && !listingsTruncated && !catalogTruncated}
        />
      )}
      {catalogTruncated || unitsTruncated ? (
        <p className="ebay-preview-note">
          WholeCell matching is bounded to the first 500 catalog SKUs and 500 serialized units.
        </p>
      ) : null}
    </div>
  );
}
