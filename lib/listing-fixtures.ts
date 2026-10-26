import {
  availableProvider,
  toBestBuyRows,
  toEbayRows,
  toReebeloRows,
  unavailableProvider,
  type ListingRow,
  type ProviderListingResult,
} from "./listing-rows.ts";

/** Fixture provider results for the listing view preview. */
export const fixtureListingProviders: readonly ProviderListingResult[] = [
  availableProvider(
    "ebay",
    toEbayRows({
      listings: [
        {
          sku: "IPHONE16PM256BLK",
          title: "Apple iPhone 16 Pro Max 256GB Black",
          listingId: "L-1001",
          listingStatus: "Active",
          listingType: "FixedPriceItem",
          connectionType: "SKU",
          channelQuantity: 3,
          price: { amount: "1099.00", currency: "USD" },
          condition: "New",
          marketplaceId: "EBAY_US",
          startTime: "2026-10-01T10:00:00.000Z",
          viewUrl: null,
          hasVariations: false,
          observedAt: "2026-10-25T10:15:00.000Z",
          sources: ["eBay Inventory API"],
          source: "eBay Inventory API",
        },
        {
          sku: "IPHONE16PM256WHT",
          title: "Apple iPhone 16 Pro Max 256GB White",
          listingId: "L-1002",
          listingStatus: "Active",
          listingType: "FixedPriceItem",
          connectionType: "SKU",
          channelQuantity: 1,
          price: { amount: "1099.00", currency: "USD" },
          condition: "New",
          marketplaceId: "EBAY_US",
          startTime: "2026-10-01T10:00:00.000Z",
          viewUrl: null,
          hasVariations: false,
          observedAt: "2026-10-25T10:15:00.000Z",
          sources: ["eBay Trading API"],
          source: "eBay Trading API",
        },
        {
          sku: "UNMAPPED-SKU-001",
          title: "Refurbished iPhone 13 128GB Blue",
          listingId: "L-1003",
          listingStatus: "Active",
          listingType: "FixedPriceItem",
          connectionType: "UNLINKED",
          channelQuantity: 2,
          price: { amount: "449.00", currency: "USD" },
          condition: "Used",
          marketplaceId: "EBAY_US",
          startTime: "2026-09-12T08:00:00.000Z",
          viewUrl: null,
          hasVariations: false,
          observedAt: "2026-10-25T10:15:00.000Z",
          sources: ["eBay Trading API"],
          source: "eBay Trading API",
        },
      ],
      truncated: false,
      source: "eBay",
      coverage: "Seller Hub and Inventory API listings, merged by item id.",
      fetchedAt: "2026-10-25T10:15:00.000Z",
    }),
    {
      fetchedAt: "2026-10-25T10:15:00.000Z",
      truncated: false,
      coverage: "Seller Hub and Inventory API listings, merged by item id.",
    },
  ),
  unavailableProvider("amazon", "The Amazon listing read is not available for this workspace yet."),
  availableProvider(
    "bestbuy",
    toBestBuyRows({
      offers: [
        {
          offerId: "234311474",
          sku: "IPHONE16PM256BLK",
          productSku: "19889591",
          title: "Refurbished (Excellent) Apple iPhone 16 Pro Max 256GB Black",
          listingStatus: "Active",
          providerState: { active: true, stateCode: null, inactivityReasonCount: 0 },
          quantity: 3,
          price: 1049.99,
          currency: "CAD",
          categoryCode: "2115",
          leadtimeToShipDays: 2,
          source: "Best Buy Marketplace (Mirakl)",
        },
        {
          offerId: "234311475",
          sku: "SAMSUNGS23FE256",
          productSku: "19889602",
          title: "Refurbished (Good) Samsung Galaxy S23 FE 256GB",
          listingStatus: "Inactive",
          providerState: { active: false, stateCode: "11", inactivityReasonCount: 0 },
          quantity: 0,
          price: 499.99,
          currency: "CAD",
          categoryCode: "2115",
          leadtimeToShipDays: 2,
          source: "Best Buy Marketplace (Mirakl)",
        },
        {
          offerId: "234311476",
          sku: "OFFER-WITHOUT-QUANTITY",
          productSku: "19889603",
          title: "Refurbished (Excellent) Google Pixel 9 256GB",
          listingStatus: "Active",
          providerState: { active: true, stateCode: null, inactivityReasonCount: 0 },
          quantity: null,
          price: 699.99,
          currency: "CAD",
          categoryCode: "2115",
          leadtimeToShipDays: 2,
          source: "Best Buy Marketplace (Mirakl)",
        },
      ],
      truncated: false,
      source: "Best Buy Marketplace (Mirakl)",
      fetchedAt: "2026-10-25T10:15:05.000Z",
    }),
    { fetchedAt: "2026-10-25T10:15:05.000Z", truncated: false },
  ),
  availableProvider(
    "reebelo",
    toReebeloRows({
      offers: [
        {
          sku: "IPHONE16PM256BLK",
          title: "Apple iPhone 16 Pro Max 256GB Black",
          rawStatus: "ACTIVE",
          displayState: "active",
          displayReason: "stock above 0",
          quantity: 2,
          price: 1059.99,
          minPrice: 999.99,
          reebeloQuantity: 2,
          reebeloPrice: 1049.99,
          category: "Phones",
          brand: "Apple",
          condition: "Excellent",
          url: "https://a.reebelo.com/sockets/offers/1",
          updatedAt: "2026-10-24T18:00:00.000Z",
          source: "Reebelo Vendor API",
        },
        {
          sku: "IPHONE16PM256WHT",
          title: "Apple iPhone 16 Pro Max 256GB White",
          rawStatus: "ACTIVE",
          displayState: "active",
          displayReason: "stock above 0",
          quantity: 1,
          price: 1059.99,
          minPrice: 999.99,
          reebeloQuantity: 1,
          reebeloPrice: 1049.99,
          category: "Phones",
          brand: "Apple",
          condition: "Excellent",
          url: "https://a.reebelo.com/sockets/offers/2",
          updatedAt: "2026-10-24T18:00:00.000Z",
          source: "Reebelo Vendor API",
        },
      ],
      total: 2,
      truncated: false,
      source: "Reebelo Vendor API",
      fetchedAt: "2026-10-25T10:15:08.000Z",
    }),
    { fetchedAt: "2026-10-25T10:15:08.000Z", truncated: false },
  ),
];

/**
 * The tenant's available quantity per catalog sku for the preview.
 *
 * The eBay quantity matches, the Best Buy quantity for one sku differs, and the
 * offer with no reported quantity is an unknown rather than a zero.
 */
export const fixtureTenantQuantities: ReadonlyMap<string, number> = new Map([
  ["IPHONE16PM256BLK", 3],
  ["IPHONE16PM256WHT", 1],
  ["SAMSUNGS23FE256", 1],
  ["OFFER-WITHOUT-QUANTITY", 2],
]);

/** A single row, for tests. */
export function fixtureRow(overrides: Partial<ListingRow> = {}): ListingRow {
  return {
    key: "k",
    provider: "ebay",
    externalId: "L-1",
    providerSku: "SKU-1",
    title: "A product",
    state: "active",
    rawState: "Active",
    stateReason: null,
    quantity: 2,
    price: 10,
    currency: "USD",
    channel: null,
    catalogSku: "SKU-1",
    observedAt: "2026-10-25T10:00:00.000Z",
    ...overrides,
  };
}

/**
 * Applies a catalog mapping to the fixture rows.
 *
 * The reducers leave `catalogSku` null because a mapping is a reviewed decision
 * the backend owns. The preview applies one so the comparison states are
 * visible.
 */
export function withFixtureMappings(
  providers: readonly ProviderListingResult[],
  mapping: ReadonlyMap<string, string>,
): readonly ProviderListingResult[] {
  return providers.map((provider) => ({
    ...provider,
    rows: provider.rows.map((row) => {
      const catalogSku = row.providerSku ? (mapping.get(row.providerSku) ?? null) : null;
      return { ...row, catalogSku };
    }),
  }));
}

/** The mapping the preview uses. */
export const fixtureMapping: ReadonlyMap<string, string> = new Map([
  ["IPHONE16PM256BLK", "IPHONE16PM256BLK"],
  ["IPHONE16PM256WHT", "IPHONE16PM256WHT"],
  ["SAMSUNGS23FE256", "SAMSUNGS23FE256"],
  ["OFFER-WITHOUT-QUANTITY", "OFFER-WITHOUT-QUANTITY"],
]);
