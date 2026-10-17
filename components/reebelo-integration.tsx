import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ReebeloConnectionStatus, ReebeloOffer } from "../lib/api";
import {
  filterReebeloOffers,
  parseReebeloStateFilter,
  reebeloDisplayStateLabels,
  reebeloDisplayStates,
  sortReebeloOffers,
  summarizeReebeloOffers,
} from "../lib/reebelo-listing-state";
import { connectReebeloAction, disconnectReebeloAction } from "../app/dashboard/integrations/reebelo/actions";

type Tab = "details" | "listings";

const messages: Record<string, { tone: "success" | "note"; text: string }> = {
  connected: {
    tone: "success",
    text: "Reebelo key verified and saved. Listings are read on the Listings tab.",
  },
  disconnected: { tone: "success", text: "Reebelo disconnected and the stored key was deleted." },
  key_rejected: {
    tone: "note",
    text: "Reebelo did not accept that key. Check that it is the vendor API key Reebelo issued to this seller. Nothing was saved.",
  },
  invalid_request: { tone: "note", text: "Enter the Reebelo vendor API key." },
  owner_required: { tone: "note", text: "Only an organization owner can change the Reebelo connection." },
  rate_limited: {
    tone: "note",
    text: "Reebelo is rate limiting requests. Wait a few minutes and try again.",
  },
  error: { tone: "note", text: "The Reebelo connection could not be updated. Please try again." },
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
      href={`/dashboard/integrations/reebelo?${new URLSearchParams({ tab, organizationId })}`}
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
  status: ReebeloConnectionStatus | null;
  organizationId: string;
  isOwner: boolean;
}) {
  const connection = status?.connection ?? null;
  return (
    <div className="ebay-details-grid">
      <section className="ebay-config-card" aria-labelledby="reebelo-connection-title">
        <div className="ebay-section-heading">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id="reebelo-connection-title">Connection details</h2>
          </div>
          <span className="ebay-status">{status?.connected ? "Connected" : "Not connected"}</span>
        </div>
        <dl className="ebay-connection-facts">
          <div>
            <dt>Provider</dt>
            <dd>Reebelo Vendor API</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Read-only vendor API key</dd>
          </div>
          <div>
            <dt>Key last verified</dt>
            <dd>{connection ? new Date(connection.keyValidatedAt).toLocaleString() : "—"}</dd>
          </div>
        </dl>
        {isOwner ? (
          <form action={connectReebeloAction} className="bestbuy-key-form" autoComplete="off">
            <input type="hidden" name="organizationId" value={organizationId} />
            <label>
              {status?.connected ? "Replace API key" : "Reebelo vendor API key"}
              <input
                name="apiKey"
                type="password"
                required
                minLength={8}
                maxLength={512}
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste the key Reebelo issued to this seller"
              />
            </label>
            <button className="primary-button" type="submit">
              {status?.connected ? "Verify and replace key" : "Verify and connect"}
            </button>
            <p className="ebay-preview-note">
              The key is checked with a read-only request, stored encrypted on the server, and never shown
              again. Marketplace OS does not create, change, or delete any Reebelo offer.
            </p>
          </form>
        ) : (
          <p className="ebay-preview-note">An organization owner must connect the Reebelo account.</p>
        )}
        {isOwner && status?.connected ? (
          <form action={disconnectReebeloAction}>
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
          This screen reads your Reebelo offers. It does not create or edit offers, change prices or stock, or
          import orders. Reebelo access is issued by Reebelo; Canadian availability is not confirmed.
        </span>
      </aside>
    </div>
  );
}

function ListingsView({
  offers,
  total,
  error,
  truncated,
  connected,
  fetchedAt,
  stateFilter,
  query,
  organizationId,
}: {
  offers: readonly ReebeloOffer[];
  total: number;
  error: string | null;
  truncated: boolean;
  connected: boolean;
  fetchedAt: string | null;
  stateFilter: string | undefined;
  query: string | undefined;
  organizationId: string;
}) {
  const filter = parseReebeloStateFilter(stateFilter);
  const summary = summarizeReebeloOffers(offers);
  const needle = query?.trim().toLowerCase() ?? "";
  const rows = filterReebeloOffers(sortReebeloOffers(offers), filter).filter(
    (offer) => !needle || [offer.title, offer.sku].some((value) => value?.toLowerCase().includes(needle)),
  );
  const link = (state: string) =>
    `?${new URLSearchParams({ tab: "listings", organizationId, ...(state === "all" ? {} : { state }) })}`;
  return (
    <section className="ebay-data-panel" aria-labelledby="reebelo-listings-title">
      <div className="ebay-section-heading">
        <div>
          <p className="eyebrow">Reebelo seller account · Read-only</p>
          <h2 id="reebelo-listings-title">Offers</h2>
        </div>
        <a className="ebay-secondary-button" href={link(filter)}>
          Refresh
        </a>
      </div>
      {connected && !error ? (
        <>
          <section className="amazon-summary" aria-label="Reebelo offer counts">
            <div>
              <span>Total</span>
              <strong>{total.toLocaleString()}</strong>
            </div>
            {reebeloDisplayStates.map((state) => (
              <div key={state}>
                <span>{reebeloDisplayStateLabels[state]}</span>
                <strong>{summary.byState[state].toLocaleString()}</strong>
              </div>
            ))}
          </section>
          <nav className="ebay-tabs" aria-label="Filter offers by state">
            <Link className={`ebay-tab ${filter === "all" ? "selected" : ""}`} href={link("all")}>
              All
            </Link>
            {reebeloDisplayStates.map((state) => (
              <Link
                key={state}
                className={`ebay-tab ${filter === state ? "selected" : ""}`}
                href={link(state)}
              >
                {reebeloDisplayStateLabels[state]} ({summary.byState[state]})
              </Link>
            ))}
          </nav>
          <p className="ebay-preview-note">
            State is derived by Marketplace OS from Reebelo&apos;s status and your stock: ACTIVE with stock is
            Active, ACTIVE with no stock is Out of stock, MISSING_INFO is Incomplete. The raw Reebelo status
            is shown in each row.
          </p>
          <form className="ebay-filter-panel" method="get">
            <input type="hidden" name="tab" value="listings" />
            <input type="hidden" name="organizationId" value={organizationId} />
            {filter === "all" ? null : <input type="hidden" name="state" value={filter} />}
            <label>
              Search
              <input name="q" placeholder="Title or SKU" defaultValue={query} />
            </label>
            <button className="primary-button" type="submit">
              Search
            </button>
          </form>
        </>
      ) : null}
      <div className="ebay-table-wrap">
        <table className="ebay-table">
          <thead>
            <tr>
              <th>State</th>
              <th>Reebelo status</th>
              <th>Title</th>
              <th>SKU</th>
              <th>Condition</th>
              <th>Your price</th>
              <th>Your stock</th>
              <th>Reebelo stock</th>
              <th>Read time</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={9} className="ebay-empty-cell">
                  <strong>Offers could not be loaded</strong>
                  <span>
                    {error === "reconnect_required"
                      ? "Reebelo no longer accepts the stored key. Ask an organization owner to replace it."
                      : error === "rate_limited"
                        ? "Reebelo is rate limiting requests. Wait a few minutes and refresh."
                        : "Reebelo offer data is temporarily unavailable. Retry the read."}
                  </span>
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((offer, index) => (
                <tr key={`${offer.sku ?? "offer"}-${index}`}>
                  <td>{reebeloDisplayStateLabels[offer.displayState]}</td>
                  <td>{offer.rawStatus ?? "—"}</td>
                  <td>{offer.title}</td>
                  <td>{offer.sku ?? "—"}</td>
                  <td>{offer.condition ?? "—"}</td>
                  <td>{offer.price === null ? "—" : offer.price.toFixed(2)}</td>
                  <td>{offer.quantity ?? "—"}</td>
                  <td>{offer.reebeloQuantity ?? "—"}</td>
                  <td>{fetchedAt ? new Date(fetchedAt).toLocaleString() : "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="ebay-empty-cell">
                  <strong>
                    {!connected
                      ? "Connect a Reebelo key to view offers"
                      : offers.length
                        ? "No offers match these filters"
                        : "No Reebelo offers found"}
                  </strong>
                  <span>
                    {connected
                      ? "Marketplace OS shows only what Reebelo returns for this account."
                      : "No provider state is inferred before the account is connected."}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="ebay-preview-note">
          Showing the first {offers.length.toLocaleString()} of {total.toLocaleString()} offers.
        </p>
      ) : null}
    </section>
  );
}

export function ReebeloIntegration({
  tab,
  organizationId,
  organizationName,
  isOwner,
  status,
  statusError,
  offers,
  offersTotal,
  offersError,
  offersTruncated,
  offersFetchedAt,
  callbackStatus,
  stateFilter,
  query,
}: {
  tab: string | undefined;
  organizationId: string;
  organizationName: string;
  isOwner: boolean;
  status: ReebeloConnectionStatus | null;
  statusError: string | null;
  offers: readonly ReebeloOffer[];
  offersTotal: number;
  offersError: string | null;
  offersTruncated: boolean;
  offersFetchedAt: string | null;
  callbackStatus: string | undefined;
  stateFilter: string | undefined;
  query: string | undefined;
}) {
  const current = activeTab(tab);
  const message = callbackStatus ? messages[callbackStatus] : undefined;
  return (
    <div className="ebay-page">
      <Link className="ebay-back-link" href="/dashboard/integrations">
        ← All integrations
      </Link>
      <section className="ebay-account-summary" aria-labelledby="reebelo-account-title">
        <div className="ebay-account-identity">
          <span className="partner-guide-brand" aria-hidden="true">
            <Image
              src="/integrations/reebelo-logo.svg"
              alt=""
              width={134}
              height={29}
              className="partner-platform-logo"
            />
          </span>
          <div>
            <p className="eyebrow">Marketplace integration</p>
            <h1 id="reebelo-account-title">Reebelo</h1>
            <small>{organizationName}</small>
          </div>
        </div>
        <span className="ebay-status">
          {status?.connected ? "Connected" : statusError ? "Status unavailable" : "Not connected"}
        </span>
        {message ? (
          <p className={message.tone === "success" ? "ebay-success-note" : "ebay-preview-note"}>
            {message.text}
          </p>
        ) : null}
      </section>
      <nav className="ebay-tabs" aria-label="Reebelo integration views">
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
          total={offersTotal}
          error={offersError}
          truncated={offersTruncated}
          connected={!!status?.connected}
          fetchedAt={offersFetchedAt}
          stateFilter={stateFilter}
          query={query}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
