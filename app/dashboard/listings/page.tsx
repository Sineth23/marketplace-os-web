import { redirect } from "next/navigation";

import { ListingComparisonView, ListingViewEmpty } from "../../../components/listing-comparison-view";
import { WorkspaceShell } from "../../../components/workspace-shell";
import {
  getAmazonListings,
  getBestBuyOffers,
  getEbayListings,
  getReebeloOffers,
  listAllInventory,
  listProviderMappings,
  listInventoryUnits,
  listOrganizations,
} from "../../../lib/api";
import {
  availableProvider,
  toBestBuyRows,
  toEbayRows,
  toReebeloRows,
  unavailableProvider,
  type ListingProvider,
  type ProviderListingResult,
} from "../../../lib/listing-rows";
import { session } from "../../../lib/auth";

/**
 * The marketplace listing view.
 *
 * Reads each connected marketplace and shows what is listed where, beside the
 * tenant's own available count. A provider that cannot be read is shown as
 * unavailable rather than being left out, so a partial read is never mistaken
 * for a complete one.
 */

/** The providers this view reads, in the order they are shown. */
const readOrder: readonly ListingProvider[] = ["ebay", "amazon", "bestbuy", "reebelo"];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; provider?: string; state?: string; comparison?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const providerFilter = params.provider?.trim() ?? "";
  const stateFilter = params.state?.trim() ?? "";
  const comparisonFilter = params.comparison?.trim() ?? "";

  // The tenant's own available count per catalog sku.
  const tenantQuantityByCatalogSku = new Map<string, number>();
  const [skus, units] = await Promise.all([
    listAllInventory(organization.id).catch(() => []),
    listInventoryUnits(organization.id).catch(() => null),
  ]);
  for (const sku of skus) {
    tenantQuantityByCatalogSku.set(sku.sourceSku, 0);
  }
  if (units) {
    for (const unit of units.items) {
      if (unit.inventoryState !== "available") continue;
      const sku = skus.find((item) => item.id === unit.skuId);
      if (!sku) continue;
      tenantQuantityByCatalogSku.set(sku.sourceSku, (tenantQuantityByCatalogSku.get(sku.sourceSku) ?? 0) + 1);
    }
  }

  const [ebay, amazon, bestBuy, reebelo, mappings] = await Promise.all([
    getEbayListings(organization.id)
      .then((response) =>
        availableProvider("ebay", toEbayRows(response), {
          fetchedAt: response.fetchedAt,
          truncated: response.truncated,
          coverage: response.coverage,
        }),
      )
      .catch((error: unknown) =>
        unavailableProvider("ebay", error instanceof Error ? error.message : "The eBay listing read failed."),
      ),
    getAmazonListings(organization.id)
      .then((response) =>
        availableProvider(
          "amazon",
          response.listings.map((listing) => ({
            key: listing.id,
            provider: "amazon" as const,
            externalId: listing.id,
            providerSku: listing.sellerSku,
            title: listing.title ?? listing.sellerSku,
            state:
              listing.displayState === "active"
                ? ("active" as const)
                : listing.displayState === "inactive"
                  ? ("inactive" as const)
                  : listing.displayState === "incomplete"
                    ? ("incomplete" as const)
                    : ("unknown" as const),
            rawState: listing.rawStatus.join(", "),
            stateReason: listing.displayReason,
            quantity: listing.amazonQuantity,
            price: null,
            currency: null,
            channel: listing.marketplaceId,
            catalogSku: listing.mappedSku,
            observedAt: listing.providerObservedAt,
          })),
          { fetchedAt: response.fetchedAt, truncated: false },
        ),
      )
      .catch((error: unknown) =>
        unavailableProvider(
          "amazon",
          error instanceof Error ? error.message : "The Amazon listing read failed.",
        ),
      ),
    getBestBuyOffers(organization.id)
      .then((response) =>
        availableProvider("bestbuy", toBestBuyRows(response), {
          fetchedAt: response.fetchedAt,
          truncated: response.truncated,
        }),
      )
      .catch((error: unknown) =>
        unavailableProvider(
          "bestbuy",
          error instanceof Error ? error.message : "The Best Buy offer read failed.",
        ),
      ),
    getReebeloOffers(organization.id)
      .then((response) =>
        availableProvider("reebelo", toReebeloRows(response), {
          fetchedAt: response.fetchedAt,
          truncated: response.truncated,
        }),
      )
      .catch((error: unknown) =>
        unavailableProvider(
          "reebelo",
          error instanceof Error ? error.message : "The Reebelo offer read failed.",
        ),
      ),
    listProviderMappings(organization.id).catch(() => []),
  ]);

  const byProvider = new Map<ListingProvider, ProviderListingResult>([
    ["ebay", ebay],
    ["amazon", amazon],
    ["bestbuy", bestBuy],
    ["reebelo", reebelo],
  ]);

  /*
   * A listing is comparable with the tenant's own stock once a reviewed mapping
   * links it to a catalogue record. The mapping is keyed on the provider and the
   * provider's own sku, because that is the identifier the provider repeats
   * across reads.
   */
  const catalogSkuByProviderSku = new Map<string, string>();
  for (const mapping of mappings) {
    if (mapping.state !== "linked" || !mapping.inventorySku) continue;
    catalogSkuByProviderSku.set(`${mapping.provider}:${mapping.providerSku}`, mapping.inventorySku);
  }

  const results: readonly ProviderListingResult[] = readOrder.flatMap((provider) => {
    const result = byProvider.get(provider);
    if (!result) return [];
    const rows = result.rows.map((row) => {
      if (row.catalogSku) return row;
      const key = `${row.provider}:${row.providerSku ?? row.externalId ?? row.key}`;
      const catalogSku = catalogSkuByProviderSku.get(key);
      return catalogSku ? { ...row, catalogSku } : row;
    });
    return [{ ...result, rows }];
  });
  const totalListings = results.reduce((sum, result) => sum + result.rows.length, 0);

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="listings">
      <section className="dashboard-intro" aria-labelledby="listings-title">
        <div>
          <p className="eyebrow">Marketplaces</p>
          <h1 id="listings-title">Listings</h1>
          <p>
            What is listed in each connected marketplace, and how that compares with your own available stock.
            A provider that cannot be read is shown as unavailable, and a provider that reported no quantity
            is shown as unknown.
          </p>
        </div>
      </section>

      {totalListings === 0 ? (
        <ListingViewEmpty />
      ) : (
        <ListingComparisonView
          providers={results}
          tenantQuantityByCatalogSku={tenantQuantityByCatalogSku}
          search={search}
          providerFilter={providerFilter}
          stateFilter={stateFilter}
          comparisonFilter={comparisonFilter}
        />
      )}
    </WorkspaceShell>
  );
}
