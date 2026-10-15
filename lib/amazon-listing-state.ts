export type AmazonDisplayState = "active" | "inactive" | "incomplete" | "suppressed" | "unknown";
export type AmazonFulfillmentType = "merchant" | "amazon" | "unknown";

export const amazonDisplayStates: readonly AmazonDisplayState[] = [
  "active",
  "inactive",
  "incomplete",
  "suppressed",
  "unknown",
];

export const amazonDisplayStateLabels: Readonly<Record<AmazonDisplayState, string>> = {
  active: "Active",
  inactive: "Inactive",
  incomplete: "Incomplete",
  suppressed: "Suppressed",
  unknown: "Unknown",
};

export function parseAmazonStateFilter(value: string | undefined): AmazonDisplayState | "all" {
  return amazonDisplayStates.find((state) => state === value) ?? "all";
}

type Stateful = Readonly<{
  displayState: AmazonDisplayState;
  fulfillmentType: AmazonFulfillmentType;
}>;

export function summarizeAmazonListings(listings: readonly Stateful[]) {
  const byState = Object.fromEntries(amazonDisplayStates.map((state) => [state, 0])) as Record<
    AmazonDisplayState,
    number
  >;
  let amazonFulfilled = 0;
  let merchantFulfilled = 0;
  for (const listing of listings) {
    byState[listing.displayState] += 1;
    if (listing.fulfillmentType === "amazon") amazonFulfilled += 1;
    if (listing.fulfillmentType === "merchant") merchantFulfilled += 1;
  }
  return { total: listings.length, byState, amazonFulfilled, merchantFulfilled };
}

// Active first, then the remaining states in display order; stable within a state.
export function sortAmazonListings<T extends Stateful>(listings: readonly T[]): T[] {
  const rank = (listing: T) => amazonDisplayStates.indexOf(listing.displayState);
  return listings
    .map((listing, index) => ({ listing, index }))
    .sort((a, b) => rank(a.listing) - rank(b.listing) || a.index - b.index)
    .map(({ listing }) => listing);
}

export function filterAmazonListings<T extends Stateful>(
  listings: readonly T[],
  filter: AmazonDisplayState | "all",
): T[] {
  return filter === "all" ? [...listings] : listings.filter((l) => l.displayState === filter);
}
