import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { BestBuyConnectionStatus, BestBuyOffer, InventorySku } from "../lib/api";
import { connectBestBuyAction, disconnectBestBuyAction } from "../app/dashboard/integrations/bestbuy/actions";

type Tab = "details" | "listings";

const messages: Record<string, { tone: "success" | "note"; text: string }> = {
  connected: {
    tone: "success",
    text: "Best Buy key verified and saved. Listings are read on the Listings tab.",
  },
  disconnected: { tone: "success", text: "Best Buy disconnected and the stored key was deleted." },
  key_rejected: {
    tone: "note",
    text: "Best Buy did not accept that key. Check that it is the Mirakl API key from the seller back office (profile menu, API Key tab). Nothing was saved.",
  },
  invalid_request: { tone: "note", text: "Enter the API key and, optionally, a numeric shop ID." },
  owner_required: { tone: "note", text: "Only an organization owner can change the Best Buy connection." },
  rate_limited: {
    tone: "note",
    text: "Best Buy is rate limiting requests. Wait a few minutes and try again.",
  },
  error: { tone: "note", text: "The Best Buy connection could not be updated. Please try again." },
};

function activeTab(value: string | undefined): Tab {
  return value === "listings" ? "listings" : "details";
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
      href={`/dashboard/integrations/bestbuy?${new URLSearchParams({ tab, organizationId })}`}
      aria-current={current === tab ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function DetailsView({
  status,
  organizationId,
  isOwner,
}: {
  status: BestBuyConnectionStatus | null;
  organizationId: string;
  isOwner: boolean;
}) {
  const connection = status?.connection ?? null;
  return (
    <div className="ebay-details-grid">
      <section className="ebay-config-card" aria-labelledby="bestbuy-connection-title">
        <div className="ebay-section-heading">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id="bestbuy-connection-title">Connection details</h2>
          </div>
          <span className="ebay-status">{status?.connected ? "Connected" : "Not connected"}</span>
        </div>
        <dl className="ebay-connection-facts">
          <div>
            <dt>Provider</dt>
            <dd>Best Buy Canada Marketplace</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Read-only seller API key</dd>
          </div>
          <div>
            <dt>Shop ID</dt>
            <dd>{connection ? (connection.shopId ?? "Default shop") : "—"}</dd>
          </div>
          <div>
            <dt>Key last verified</dt>
            <dd>{connection ? new Date(connection.keyValidatedAt).toLocaleString() : "—"}</dd>
          </div>
        </dl>
        {isOwner ? (
          <form action={connectBestBuyAction} className="bestbuy-key-form" autoComplete="off">
            <input type="hidden" name="organizationId" value={organizationId} />
            <label>
              {status?.connected ? "Replace API key" : "Mirakl API key"}
              <input
                name="apiKey"
                type="password"
                required
                minLength={8}
                maxLength={512}
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste the key from the seller back office"
              />
            </label>
            <label>
              Shop ID (optional)
              <input
                name="shopId"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Only if you have several shops"
              />
            </label>
            <button className="primary-button" type="submit">
              {status?.connected ? "Verify and replace key" : "Verify and connect"}
            </button>
            <p className="ebay-preview-note">
              The key is checked with a read-only request, stored encrypted on the server, and never shown
              again. Marketplace OS does not create, change, or delete any Best Buy listing.
            </p>
          </form>
        ) : (
          <p className="ebay-preview-note">An organization owner must connect the Best Buy account.</p>
        )}
        {isOwner && status?.connected ? (
          <form action={disconnectBestBuyAction}>
            <input type="hidden" name="organizationId" value={organizationId} />
            <button className="ebay-secondary-button" type="submit">
              Disconnect and delete key
            </button>
          </form>
        ) : null}
      </section>
      <aside className="partner-guide-boundary">
        <strong>Read-only</strong>
        <span>
          This screen reads your Best Buy offers. It does not publish or edit listings, import orders, or
          change stock. Marketplace OS inventory remains the source of truth for quantity.
        </span>
      </aside>
    </div>
  );
}

function ListingsView({
  offers,
  error,
  truncated,
  connected,
  inventoryItems,
  unitQuantities,
  fetchedAt,
  filters,
  organizationId,
}: {
  offers: readonly BestBuyOffer[];
  error: string | null;
  truncated: boolean;
  connected: boolean;
  inventoryItems: readonly InventorySku[];
  unitQuantities: Readonly<Record<string, number>>;
  fetchedAt: string | null;
  filters: {
    q?: string | undefined;
    listingStatus?: string | undefined;
    connectionStatus?: string | undefined;
  };
  organizationId: string;
}) {
  const inventoryBySku = new Map(inventoryItems.map((item) => [item.sourceSku.toLowerCase(), item]));
  const query = filters.q?.trim().toLowerCase() ?? "";
  const rows = offers.filter((offer) => {
    const catalogSku = offer.sku ? inventoryBySku.get(offer.sku.toLowerCase()) : undefined;
    if (filters.listingStatus === "Active" && offer.listingStatus !== "Active") return false;
    if (filters.listingStatus === "Inactive" && offer.listingStatus !== "Inactive") return false;
    if (filters.connectionStatus === "Connected" && !catalogSku) return false;
    if (filters.connectionStatus === "Not Connected" && catalogSku) return false;
    if (!query) return true;
    return [offer.title, offer.sku, offer.offerId, offer.productSku].some((value) =>
      value?.toLowerCase().includes(query),
    );
  });
  return (
    <section className="ebay-data-panel" aria-labelledby="bestbuy-listings-title">
      <div className="ebay-section-heading">
        <div>
          <p className="eyebrow">Best Buy seller account · Read-only</p>
          <h2 id="bestbuy-listings-title">Linked Listings</h2>
        </div>
        <a
          className="ebay-secondary-button"
          href={`?${new URLSearchParams({ tab: "listings", organizationId })}`}
        >
          Refresh
        </a>
      </div>
      <p className="ebay-preview-note">
        Live read of your Best Buy Marketplace offers. Quantities are Best Buy&apos;s; the Marketplace OS
        column counts units your team has reviewed as available.
      </p>
      <form className="ebay-filter-panel" method="get">
        <input type="hidden" name="tab" value="listings" />
        <input type="hidden" name="organizationId" value={organizationId} />
        <label>
          Search
          <input name="q" placeholder="Title, offer ID, or SKU" defaultValue={filters.q} />
        </label>
        <label>
          Listing status
          <select name="listingStatus" defaultValue={filters.listingStatus ?? "All"}>
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
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
              <th>Offer ID</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Channel quantity</th>
              <th>Marketplace OS available units</th>
              <th>Read time</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={9} className="ebay-empty-cell">
                  <strong>Listings could not be loaded</strong>
                  <span>
                    {error === "reconnect_required"
                      ? "Best Buy no longer accepts the stored key. Ask an organization owner to replace it."
                      : error === "rate_limited"
                        ? "Best Buy is rate limiting requests. Wait a few minutes and refresh."
                        : "Best Buy listing data is temporarily unavailable. Retry the read."}
                  </span>
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((offer, index) => {
                const catalogSku = offer.sku ? inventoryBySku.get(offer.sku.toLowerCase()) : undefined;
                const reasons = offer.providerState.inactivityReasonCount;
                return (
                  <tr key={`${offer.offerId ?? offer.sku ?? "offer"}-${index}`}>
                    <td>{catalogSku ? "Matched by exact SKU" : "Not matched"}</td>
                    <td>
                      {offer.listingStatus}
                      {reasons ? ` (${reasons} reason${reasons === 1 ? "" : "s"})` : ""}
                    </td>
                    <td>{offer.title}</td>
                    <td>{offer.offerId ?? "—"}</td>
                    <td>{offer.sku ?? "—"}</td>
                    <td>
                      {offer.price === null
                        ? "—"
                        : `${offer.currency ?? ""} ${offer.price.toFixed(2)}`.trim()}
                    </td>
                    <td>{offer.quantity ?? "—"}</td>
                    <td>
                      {catalogSku ? (unitQuantities[catalogSku.sourceSku.toLowerCase()] ?? 0) : "Not matched"}
                    </td>
                    <td>{fetchedAt ? `Live read · ${new Date(fetchedAt).toLocaleString()}` : "—"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="ebay-empty-cell">
                  <strong>
                    {!connected
                      ? "Connect a Best Buy key to view listings"
                      : offers.length
                        ? "No listings match these filters"
                        : "No Best Buy offers found"}
                  </strong>
                  <span>
                    {connected
                      ? "Marketplace OS shows only what Best Buy returns for this account."
                      : "No provider listing state is inferred before the account is connected."}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="ebay-preview-note">Showing the first 500 offers. Narrow the search to see others.</p>
      ) : null}
    </section>
  );
}

export function BestBuyIntegration({
  tab,
  organizationId,
  organizationName,
  isOwner,
  status,
  statusError,
  offers,
  offersError,
  offersTruncated,
  offersFetchedAt,
  inventoryItems,
  unitQuantities,
  callbackStatus,
  filters,
  catalogTruncated,
}: {
  tab: string | undefined;
  organizationId: string;
  organizationName: string;
  isOwner: boolean;
  status: BestBuyConnectionStatus | null;
  statusError: string | null;
  offers: readonly BestBuyOffer[];
  offersError: string | null;
  offersTruncated: boolean;
  offersFetchedAt: string | null;
  inventoryItems: readonly InventorySku[];
  unitQuantities: Readonly<Record<string, number>>;
  callbackStatus: string | undefined;
  filters: {
    q?: string | undefined;
    listingStatus?: string | undefined;
    connectionStatus?: string | undefined;
  };
  catalogTruncated: boolean;
}) {
  const current = activeTab(tab);
  const message = callbackStatus ? messages[callbackStatus] : undefined;
  const readable = !!status?.connected && !offersError && current === "listings";
  const activeCount = offers.filter((offer) => offer.listingStatus === "Active").length;
  return (
    <div className="ebay-page">
      <Link className="ebay-back-link" href="/dashboard/integrations">
        ← All integrations
      </Link>
      <section className="ebay-account-summary" aria-labelledby="bestbuy-account-title">
        <div className="ebay-account-identity">
          <span className="partner-guide-brand bestbuy" aria-hidden="true">
            <Image
              src="/integrations/best-buy-logo.jpg"
              alt=""
              width={64}
              height={44}
              className="partner-platform-logo"
            />
          </span>
          <div>
            <p className="eyebrow">Marketplace integration</p>
            <h1 id="bestbuy-account-title">Best Buy Marketplace</h1>
            <small>{organizationName}</small>
          </div>
        </div>
        <span className="ebay-status">
          {status?.connected ? "Connected" : statusError ? "Status unavailable" : "Not connected"}
        </span>
        <div className="ebay-summary-metrics">
          <div>
            <span>Offers read</span>
            <strong>{readable ? offers.length.toLocaleString() : "Open Listings"}</strong>
          </div>
          <div>
            <span>Active</span>
            <strong>{readable ? activeCount.toLocaleString() : "Open Listings"}</strong>
          </div>
        </div>
        {message ? (
          <p className={message.tone === "success" ? "ebay-success-note" : "ebay-preview-note"}>
            {message.text}
          </p>
        ) : null}
      </section>
      <nav className="ebay-tabs" aria-label="Best Buy integration views">
        <TabLink tab="details" current={current} organizationId={organizationId}>
          Details
        </TabLink>
        <TabLink tab="listings" current={current} organizationId={organizationId}>
          Listings
        </TabLink>
      </nav>
      {current === "details" ? (
        <DetailsView status={status} organizationId={organizationId} isOwner={isOwner} />
      ) : (
        <ListingsView
          offers={offers}
          error={offersError}
          truncated={offersTruncated}
          connected={!!status?.connected}
          inventoryItems={inventoryItems}
          unitQuantities={unitQuantities}
          fetchedAt={offersFetchedAt}
          filters={filters}
          organizationId={organizationId}
        />
      )}
      {catalogTruncated && current === "listings" ? (
        <p className="ebay-preview-note">
          Marketplace OS inventory comparison is incomplete or unavailable. Reads are bounded to the first 500
          catalog SKUs.
        </p>
      ) : null}
    </div>
  );
}
