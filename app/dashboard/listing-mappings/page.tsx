import Link from "next/link";
import { redirect } from "next/navigation";

import { ListingMappingReview } from "../../../components/listing-mapping-review";
import { WorkspaceShell } from "../../../components/workspace-shell";
import {
  getAmazonListings,
  getBestBuyOffers,
  getEbayListings,
  getReebeloOffers,
  listAllInventory,
  listOrganizations,
  listProviderMappings,
} from "../../../lib/api";
import { buildMappingRows, summarizeMappings } from "../../../lib/listing-mapping";
import { toBestBuyRows, toEbayRows, toReebeloRows, type ListingRow } from "../../../lib/listing-rows";
import { session } from "../../../lib/auth";

/**
 * The mapping review screen.
 *
 * A provider's sku and the tenant's catalogue sku are different vocabularies, so
 * a provider listing only becomes comparable once a reviewed mapping links them.
 * This screen offers the unmapped listings for review, shows the linked ones so
 * a wrong mapping can be corrected, and shows the ones deliberately rejected.
 */
export default async function ListingMappingsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const stateFilter = params.state ?? "";

  const [skus, mappings, ebay, amazon, bestBuy, reebelo] = await Promise.all([
    listAllInventory(organization.id).catch(() => []),
    listProviderMappings(organization.id).catch(() => []),
    getEbayListings(organization.id).catch(() => null),
    getAmazonListings(organization.id).catch(() => null),
    getBestBuyOffers(organization.id).catch(() => null),
    getReebeloOffers(organization.id).catch(() => null),
  ]);

  const catalogSkus = skus.map((sku) => ({ id: sku.id, sourceSku: sku.sourceSku }));

  // The Amazon read already returns a mapped sku on each row, so it is linked
  // when the provider reports one and needs no separate mapping.
  const amazonRows: ListingRow[] = (amazon?.listings ?? []).map((listing) => ({
    key: listing.id,
    provider: "amazon",
    externalId: listing.id,
    providerSku: listing.sellerSku,
    title: listing.title ?? listing.sellerSku,
    state:
      listing.displayState === "active"
        ? "active"
        : listing.displayState === "inactive"
          ? "inactive"
          : listing.displayState === "incomplete"
            ? "incomplete"
            : "unknown",
    rawState: listing.rawStatus.join(", "),
    stateReason: listing.displayReason,
    quantity: listing.amazonQuantity,
    price: null,
    currency: null,
    channel: listing.marketplaceId,
    catalogSku: listing.mappedSku,
    observedAt: listing.providerObservedAt,
  }));

  const listings: ListingRow[] = [
    ...(ebay ? toEbayRows(ebay) : []),
    ...amazonRows,
    ...(bestBuy ? toBestBuyRows(bestBuy) : []),
    ...(reebelo ? toReebeloRows(reebelo) : []),
  ];

  const existingMappings = new Map(
    mappings.map((mapping) => [`${mapping.provider}:${mapping.providerSku}`, mapping.inventorySku ?? ""]),
  );

  const rows = buildMappingRows(
    listings,
    existingMappings,
    catalogSkus.map((sku) => sku.sourceSku),
  ).map((row) => {
    // A row the provider already reported a mapping for stays linked.
    if (row.listing.catalogSku) {
      return { ...row, state: "linked" as const, catalogSku: row.listing.catalogSku };
    }
    return row;
  });

  const summary = summarizeMappings(rows);
  const unavailable = [
    !ebay ? "eBay" : null,
    !amazon ? "Amazon" : null,
    !bestBuy ? "Best Buy" : null,
    !reebelo ? "Reebelo" : null,
  ].filter((name): name is string => Boolean(name));

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="listing-mappings">
      <section className="dashboard-intro" aria-labelledby="mapping-title">
        <div>
          <p className="eyebrow">Marketplaces</p>
          <h1 id="mapping-title">Catalogue mapping</h1>
          <p>
            A marketplace&apos;s sku and a catalogue sku are different vocabularies. A provider listing only
            becomes comparable with your own stock once it is mapped. Review the unmapped listings and choose
            the catalogue sku each one belongs to.
          </p>
        </div>
      </section>

      <div className="listing-summary">
        <div className="listing-summary-item">
          <span className="listing-summary-value">{summary.total.toLocaleString()}</span>
          <span className="listing-summary-label">Listings seen</span>
        </div>
        <div className="listing-summary-item">
          <span className="listing-summary-value">{summary.linked.toLocaleString()}</span>
          <span className="listing-summary-label">Linked</span>
        </div>
        <div className="listing-summary-item">
          <span className="listing-summary-value">{summary.unlinked.toLocaleString()}</span>
          <span className="listing-summary-label">Unlinked</span>
        </div>
        <div className="listing-summary-item">
          <span className="listing-summary-value">{summary.withSuggestions.toLocaleString()}</span>
          <span className="listing-summary-label">With suggestions</span>
        </div>
        <div className="listing-summary-item">
          <span className="listing-summary-value">{summary.rejected.toLocaleString()}</span>
          <span className="listing-summary-label">Not in catalogue</span>
        </div>
      </div>

      {unavailable.length > 0 ? (
        <p className="form-message" role="status">
          {unavailable.join(", ")} could not be read, so its listings are not shown. A partial read is never a
          complete one.
        </p>
      ) : null}

      <nav className="operations-preview-nav" aria-label="Mapping filters">
        {[
          { value: "", label: "All" },
          { value: "unlinked", label: "Unlinked" },
          { value: "linked", label: "Linked" },
          { value: "rejected", label: "Not in catalogue" },
        ].map((option) => (
          <Link
            className={`quiet-button ${stateFilter === option.value ? "active" : ""}`}
            href={`/dashboard/listing-mappings${option.value ? `?state=${option.value}` : ""}`}
            key={option.value}
          >
            {option.label}
          </Link>
        ))}
        <Link className="quiet-button" href="/dashboard/listings">
          Back to listings
        </Link>
      </nav>

      {rows.length === 0 ? (
        <section className="operations-empty" aria-labelledby="mapping-empty-title">
          <span className="section-icon" aria-hidden="true">
            ⇄
          </span>
          <h2 id="mapping-empty-title">No marketplace listings to map</h2>
          <p>Connect a marketplace seller account, and the listings it reports appear here for review.</p>
          <Link className="primary-button" href="/dashboard/integrations">
            Open integrations
          </Link>
        </section>
      ) : (
        <ListingMappingReview
          organizationId={organization.id}
          rows={rows}
          catalogSkus={catalogSkus}
          stateFilter={stateFilter}
        />
      )}
    </WorkspaceShell>
  );
}
