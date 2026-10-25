import Link from "next/link";

import {
  compareListing,
  providerLabels,
  summarizeListings,
  type ListingRow,
  type ListingSummary,
  type ProviderListingResult,
} from "../lib/listing-rows";

/**
 * The cross-marketplace listing view.
 *
 * One row per listing, with the provider's reported quantity, the tenant's own
 * available count, and how the two compare. Three states are kept distinct: the
 * provider agrees, the provider reports a different quantity, and the provider
 * did not report a quantity at all. The third is an unknown, not a zero.
 */

function stateLabel(state: ListingRow["state"]): string {
  if (state === "incomplete") return "Incomplete";
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function formatQuantity(value: number | null): string {
  if (value === null) return "Not reported";
  return value.toLocaleString();
}

function formatPrice(value: number | null, currency: string | null): string {
  if (value === null) return "—";
  try {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: currency ?? "USD",
    });
  } catch {
    return value.toLocaleString();
  }
}

function formatObservedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProviderCard({ provider }: { provider: ProviderListingResult }) {
  return (
    <article className={`listing-provider-card ${provider.available ? "" : "unavailable"}`}>
      <div className="listing-provider-heading">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h3>{providerLabels[provider.provider]}</h3>
        </div>
        <span className={`listing-provider-status ${provider.available ? "available" : ""}`}>
          {provider.available ? "Read" : "Unavailable"}
        </span>
      </div>
      {provider.available ? (
        <>
          <p className="listing-provider-count">
            {provider.rows.length.toLocaleString()} {provider.rows.length === 1 ? "listing" : "listings"}
            {provider.truncated ? " (partial)" : ""}
          </p>
          <p className="listing-provider-meta">Read {formatObservedAt(provider.fetchedAt ?? "")}</p>
          {provider.coverage ? <p className="listing-provider-meta">{provider.coverage}</p> : null}
        </>
      ) : (
        <p className="listing-provider-meta">{provider.unavailableReason}</p>
      )}
    </article>
  );
}

function SummaryCard({ summary }: { summary: ListingSummary }) {
  const items: readonly Readonly<{
    label: string;
    value: string;
    tone?: "attention" | undefined;
  }>[] = [
    { label: "Listings read", value: summary.totalListings.toLocaleString() },
    { label: "Linked to catalog", value: summary.linkedListings.toLocaleString() },
    { label: "Unlinked", value: summary.unlinkedListings.toLocaleString() },
    { label: "Quantity reported", value: summary.withQuantity.toLocaleString() },
    { label: "Quantity not reported", value: summary.withoutQuantity.toLocaleString() },
    {
      label: "Quantity differs",
      value: summary.mismatchedListings.toLocaleString(),
      tone: summary.mismatchedListings > 0 ? "attention" : undefined,
    },
  ];
  return (
    <div className="listing-summary">
      {items.map((item) => (
        <div className="listing-summary-item" key={item.label}>
          <span className="listing-summary-value">{item.value}</span>
          <span className="listing-summary-label">{item.label}</span>
          {item.tone ? <span className={`listing-summary-tone ${item.tone}`} /> : null}
        </div>
      ))}
    </div>
  );
}

export function ListingComparisonView({
  providers,
  tenantQuantityByCatalogSku,
  search,
  providerFilter,
  stateFilter,
  comparisonFilter,
}: {
  providers: readonly ProviderListingResult[];
  tenantQuantityByCatalogSku: ReadonlyMap<string, number>;
  search: string;
  providerFilter: string;
  stateFilter: string;
  comparisonFilter: string;
}) {
  const summary = summarizeListings(providers, tenantQuantityByCatalogSku);
  const rows = providers
    .flatMap((provider) => provider.rows)
    .filter((row) => {
      if (providerFilter && row.provider !== providerFilter) return false;
      if (stateFilter && row.state !== stateFilter) return false;
      if (comparisonFilter) {
        const comparison = compareListing(row, tenantQuantityByCatalogSku);
        if (comparisonFilter === "mismatch" && comparison.kind !== "mismatch") return false;
        if (comparisonFilter === "unlinked" && comparison.kind !== "unlinked") return false;
        if (comparisonFilter === "unknown" && comparison.kind !== "provider-unknown") return false;
      }
      if (search) {
        const haystack = `${row.providerSku ?? ""} ${row.title} ${row.channel ?? ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.title.localeCompare(b.title));

  return (
    <>
      <div className="listing-provider-grid">
        {providers.map((provider) => (
          <ProviderCard key={provider.provider} provider={provider} />
        ))}
      </div>

      <SummaryCard summary={summary} />

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <caption className="sr-only">
            Listings across the connected marketplaces, compared with the tenant&apos;s own available quantity
          </caption>
          <thead>
            <tr>
              <th scope="col">Marketplace</th>
              <th scope="col">Product</th>
              <th scope="col">Provider SKU</th>
              <th scope="col">State</th>
              <th scope="col">Provider qty</th>
              <th scope="col">Our qty</th>
              <th scope="col">Comparison</th>
              <th scope="col">Price</th>
              <th scope="col">Read</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const comparison = compareListing(row, tenantQuantityByCatalogSku);
              return (
                <tr key={`${row.provider}:${row.key}`}>
                  <td>{providerLabels[row.provider]}</td>
                  <td>
                    <span className="listing-title">{row.title}</span>
                    {row.channel ? <span className="listing-subtitle">{row.channel}</span> : null}
                  </td>
                  <td>{row.providerSku ?? "—"}</td>
                  <td>
                    <span className={`listing-state state-${row.state}`}>{stateLabel(row.state)}</span>
                    {row.stateReason ? <span className="listing-subtitle">{row.stateReason}</span> : null}
                  </td>
                  <td>{formatQuantity(row.quantity)}</td>
                  <td>
                    {comparison.kind === "unlinked"
                      ? "—"
                      : comparison.kind === "provider-unknown"
                        ? "—"
                        : comparison.tenantQuantity.toLocaleString()}
                  </td>
                  <td>
                    {comparison.kind === "match" ? (
                      <span className="listing-comparison match">Matches</span>
                    ) : comparison.kind === "mismatch" ? (
                      <span className="listing-comparison mismatch">
                        Differs by {comparison.difference > 0 ? "+" : ""}
                        {comparison.difference}
                      </span>
                    ) : comparison.kind === "provider-unknown" ? (
                      <span className="listing-comparison unknown">Provider reported no quantity</span>
                    ) : (
                      <span className="listing-comparison unlinked">Not linked</span>
                    )}
                  </td>
                  <td>{formatPrice(row.price, row.currency)}</td>
                  <td>{formatObservedAt(row.observedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="listing-summary-line">
        Showing {rows.length.toLocaleString()} of {summary.totalListings.toLocaleString()} listings. A
        provider that reported no quantity is shown as unknown, never as zero.
      </p>
    </>
  );
}

export function ListingViewEmpty() {
  return (
    <section className="operations-empty" aria-labelledby="listing-empty-title">
      <span className="section-icon" aria-hidden="true">
        ⇄
      </span>
      <h2 id="listing-empty-title">No marketplace listings yet</h2>
      <p>
        Connect a marketplace seller account to see what is listed where, and how that compares with your own
        inventory.
      </p>
      <Link className="primary-button" href="/dashboard/integrations">
        Open integrations
      </Link>
    </section>
  );
}
