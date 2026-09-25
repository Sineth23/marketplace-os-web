import Link from "next/link";
import type { ReactNode } from "react";

type Tab = "details" | "listings" | "opportunities";
type InventorySummary = Readonly<{ skuCount: number; unitCount: number }>;

function activeTab(value: string | undefined): Tab {
  if (value === "listings" || value === "opportunities") return value;
  return "details";
}

function TabLink({ tab, current, children }: { tab: Tab; current: Tab; children: ReactNode }) {
  return (
    <Link
      className={`ebay-tab ${current === tab ? "selected" : ""}`}
      href={`/dashboard/integrations/ebay?tab=${tab}`}
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

function DetailsView() {
  return (
    <div className="ebay-details-grid">
      <section className="ebay-config-card" aria-labelledby="ebay-connection-title">
        <div className="ebay-section-heading">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id="ebay-connection-title">Connection details</h2>
          </div>
          <span className="ebay-status">Not connected</span>
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
            <dd>No account linked</dd>
          </div>
        </dl>
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

function ListingsView() {
  return (
    <section className="ebay-data-panel" aria-labelledby="ebay-listings-title">
      <div className="ebay-section-heading">
        <div>
          <p className="eyebrow">eBay account · Preview</p>
          <h2 id="ebay-listings-title">Linked Listings</h2>
        </div>
        <button className="ebay-disabled-button" type="button" disabled>
          Import Listings
        </button>
      </div>
      <p className="ebay-preview-note">
        Demo view only. There is no connected eBay account or imported listing data.
      </p>
      <form className="ebay-filter-panel" method="get">
        <input type="hidden" name="tab" value="listings" />
        <label>
          Search
          <input name="q" placeholder="Title, listing ID, or SKU" />
        </label>
        <label>
          Listing status
          <select name="listingStatus" defaultValue="All">
            <option>All</option>
            <option>Active</option>
            <option>Error</option>
            <option>Ended</option>
          </select>
        </label>
        <label>
          Product connection status
          <select name="connectionStatus" defaultValue="All">
            <option>All</option>
            <option>Connected</option>
            <option>Not Connected</option>
          </select>
        </label>
        <label>
          Product connection type
          <select name="connectionType" defaultValue="All">
            <option>All</option>
            <option>SKU</option>
            <option>Specific Product Variations</option>
            <option>Inventory</option>
          </select>
        </label>
        <label>
          SKU changed since import
          <select name="skuChanged" defaultValue="All">
            <option>All</option>
            <option>Yes</option>
            <option>No</option>
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
            <tr>
              <td colSpan={9} className="ebay-empty-cell">
                <strong>No listing data available</strong>
                <span>
                  Connect and authorize an eBay account in a future, separately approved integration
                  milestone. No listing data is being simulated.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OpportunitiesView() {
  return (
    <section className="ebay-data-panel" aria-labelledby="ebay-opportunities-title">
      <div className="ebay-section-heading">
        <div>
          <p className="eyebrow">eBay account · Preview</p>
          <h2 id="ebay-opportunities-title">Listing Opportunities</h2>
        </div>
      </div>
      <p className="ebay-preview-note">
        Opportunities require approved inventory and listing data plus configured status and warehouse
        criteria. This preview cannot determine eBay listing eligibility.
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
            <tr>
              <td colSpan={5} className="ebay-empty-cell">
                <strong>No listing opportunities to show</strong>
                <span>
                  No opportunity rows are inferred from inventory alone because this workspace has no eBay
                  listing state or inventory eligibility settings.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EbayIntegration({
  tab: requestedTab,
  organizationName,
  inventorySummary,
}: {
  tab?: string | undefined;
  organizationName: string;
  inventorySummary: InventorySummary | null;
}) {
  const tab = activeTab(requestedTab);
  return (
    <div className="ebay-page">
      <section className="dashboard-intro ebay-page-intro">
        <div>
          <Link className="ebay-back-link" href="/dashboard/integrations">
            ← All integrations
          </Link>
          <p className="eyebrow">Marketplace preview</p>
          <h1>eBay Integration</h1>
          <p>
            WholeCell remains the source of truth. This is a UI preview; it does not connect to eBay or change
            marketplace data.
          </p>
        </div>
      </section>

      <section className="ebay-account-summary" aria-labelledby="ebay-account-title">
        <div className="ebay-account-identity">
          <span className="ebay-mark" aria-hidden="true">
            e
          </span>
          <div>
            <p className="eyebrow">Account summary · Preview</p>
            <h2 id="ebay-account-title">{organizationName}</h2>
            <span>No eBay account connected</span>
          </div>
        </div>
        <span className="ebay-status">Not connected</span>
        <div className="ebay-summary-metrics">
          <div>
            <span>Authentication</span>
            <strong>Not connected</strong>
          </div>
          <div>
            <span>Order import</span>
            <strong>Not configured</strong>
          </div>
          <div>
            <span>Inventory sync</span>
            <strong>Not configured</strong>
          </div>
          <div>
            <span>Listing import</span>
            <strong>Not configured</strong>
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
          Inventory counts come from the authenticated {organizationName} workspace. eBay status values are
          not live provider data.
        </small>
      </section>

      <nav className="ebay-tabs" aria-label="eBay integration views">
        <TabLink tab="details" current={tab}>
          Details
        </TabLink>
        <TabLink tab="listings" current={tab}>
          Listings
        </TabLink>
        <TabLink tab="opportunities" current={tab}>
          Listing Opportunities
        </TabLink>
      </nav>

      {tab === "details" ? <DetailsView /> : tab === "listings" ? <ListingsView /> : <OpportunitiesView />}
    </div>
  );
}
