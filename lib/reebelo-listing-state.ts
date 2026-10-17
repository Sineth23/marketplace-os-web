export type ReebeloDisplayState = "active" | "inactive" | "incomplete" | "unknown";

export const reebeloDisplayStates: readonly ReebeloDisplayState[] = [
  "active",
  "inactive",
  "incomplete",
  "unknown",
];

export const reebeloDisplayStateLabels: Readonly<Record<ReebeloDisplayState, string>> = {
  active: "Active",
  inactive: "Out of stock",
  incomplete: "Incomplete",
  unknown: "Unknown",
};

export function parseReebeloStateFilter(value: string | undefined): ReebeloDisplayState | "all" {
  return reebeloDisplayStates.find((state) => state === value) ?? "all";
}

type Stateful = Readonly<{ displayState: ReebeloDisplayState }>;

export function summarizeReebeloOffers(offers: readonly Stateful[]) {
  const byState = Object.fromEntries(reebeloDisplayStates.map((state) => [state, 0])) as Record<
    ReebeloDisplayState,
    number
  >;
  for (const offer of offers) byState[offer.displayState] += 1;
  return { total: offers.length, byState };
}

// Active first, then the remaining states in display order; stable within a state.
export function sortReebeloOffers<T extends Stateful>(offers: readonly T[]): T[] {
  const rank = (offer: T) => reebeloDisplayStates.indexOf(offer.displayState);
  return offers
    .map((offer, index) => ({ offer, index }))
    .sort((a, b) => rank(a.offer) - rank(b.offer) || a.index - b.index)
    .map(({ offer }) => offer);
}

export function filterReebeloOffers<T extends Stateful>(
  offers: readonly T[],
  filter: ReebeloDisplayState | "all",
): T[] {
  return filter === "all" ? [...offers] : offers.filter((offer) => offer.displayState === filter);
}
