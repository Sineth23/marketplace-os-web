import { redirect } from "next/navigation";

import { BestBuyIntegration } from "../../../../components/bestbuy-integration";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import {
  MarketplaceApiError,
  getBestBuyOffers,
  getBestBuyStatus,
  listInventory,
  listInventoryUnits,
  listOrganizations,
  type BestBuyConnectionStatus,
  type BestBuyOffersResponse,
  type InventorySku,
  type InventoryUnit,
} from "../../../../lib/api";
import { session } from "../../../../lib/auth";

export default async function BestBuyIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    organizationId?: string;
    bestbuy?: string;
    q?: string;
    listingStatus?: string;
    connectionStatus?: string;
  }>;
}) {
  if (!(await session())) redirect("/");

  let organizations;
  try {
    organizations = await listOrganizations();
  } catch {
    redirect("/?signIn=expired");
  }

  const {
    tab,
    organizationId,
    bestbuy: callbackStatus,
    q,
    listingStatus,
    connectionStatus,
  } = await searchParams;
  const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0];
  if (!organization) redirect("/dashboard");

  const statusResult = await getBestBuyStatus(organization.id)
    .then((status) => ({ status, error: null as string | null }))
    .catch(() => ({ status: null as BestBuyConnectionStatus | null, error: "status_unavailable" }));
  const status = statusResult.status;

  let offersResult: BestBuyOffersResponse | null = null;
  let offersError: string | null = null;
  let inventoryItems: InventorySku[] = [];
  let inventoryUnits: InventoryUnit[] = [];
  let catalogTruncated = false;
  // Offers are read live from Best Buy only when the Listings tab is open.
  if (tab === "listings" && status?.connected) {
    const [offers, catalog, units] = await Promise.all([
      getBestBuyOffers(organization.id)
        .then((result) => ({ result, error: null as string | null }))
        .catch((error: unknown) => ({
          result: null as BestBuyOffersResponse | null,
          error: error instanceof MarketplaceApiError ? error.message : "provider_unavailable",
        })),
      listInventory(organization.id).catch(() => null),
      listInventoryUnits(organization.id).catch(() => null),
    ]);
    offersResult = offers.result;
    offersError = offers.error;
    const catalogPages = catalog ? Math.min(10, Math.ceil(catalog.total / 50)) : 0;
    const unitPages = units ? Math.min(10, Math.ceil(units.total / 50)) : 0;
    const [catalogRest, unitsRest] = await Promise.all([
      Promise.all(
        Array.from({ length: Math.max(0, catalogPages - 1) }, (_, index) =>
          listInventory(organization.id, index + 2).catch(() => null),
        ),
      ),
      Promise.all(
        Array.from({ length: Math.max(0, unitPages - 1) }, (_, index) =>
          listInventoryUnits(organization.id, index + 2).catch(() => null),
        ),
      ),
    ]);
    inventoryItems = [...(catalog?.items ?? []), ...catalogRest.flatMap((page) => page?.items ?? [])];
    inventoryUnits = [...(units?.items ?? []), ...unitsRest.flatMap((page) => page?.items ?? [])];
    catalogTruncated =
      !catalog ||
      !units ||
      catalogRest.some((page) => !page) ||
      unitsRest.some((page) => !page) ||
      catalog.total > inventoryItems.length ||
      units.total > inventoryUnits.length;
  }
  const unitQuantities = new Map<string, number>();
  for (const unit of inventoryUnits) {
    if (unit.inventoryState !== "available") continue;
    const sku = unit.sku.toLowerCase();
    unitQuantities.set(sku, (unitQuantities.get(sku) ?? 0) + 1);
  }

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="integrations">
      <BestBuyIntegration
        tab={tab}
        organizationId={organization.id}
        organizationName={organization.name}
        isOwner={organization.role === "owner"}
        status={status}
        statusError={statusResult.error}
        offers={offersResult?.offers ?? []}
        offersError={offersError}
        offersTruncated={offersResult?.truncated ?? false}
        offersFetchedAt={offersResult?.fetchedAt ?? null}
        inventoryItems={inventoryItems}
        unitQuantities={Object.fromEntries(unitQuantities)}
        callbackStatus={callbackStatus}
        filters={{ q, listingStatus, connectionStatus }}
        catalogTruncated={catalogTruncated}
      />
    </WorkspaceShell>
  );
}
