import { redirect } from "next/navigation";

import { EbayIntegration } from "../../../../components/ebay-integration";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import {
  getEbayListings,
  getEbayStatus,
  listInventory,
  listInventoryUnits,
  listOrganizations,
  type EbayConnectionStatus,
  type EbayListingsResponse,
  type InventorySku,
  type InventoryUnit,
} from "../../../../lib/api";
import { session } from "../../../../lib/auth";

export default async function EbayIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    organizationId?: string;
    ebay?: string;
    q?: string;
    listingStatus?: string;
    connectionStatus?: string;
    connectionType?: string;
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
    ebay: callbackStatus,
    q,
    listingStatus,
    connectionStatus,
    connectionType,
  } = await searchParams;
  const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0];
  if (!organization) redirect("/dashboard");

  const [catalog, units, statusResult] = await Promise.all([
    listInventory(organization.id).catch(() => null),
    listInventoryUnits(organization.id).catch(() => null),
    getEbayStatus(organization.id)
      .then((status) => ({ status, error: null as string | null }))
      .catch(() => ({ status: null, error: "status_unavailable" })),
  ]);
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
  const status: EbayConnectionStatus | null = statusResult.status;
  let listingsResult: EbayListingsResponse | null = null;
  let listingsError: string | null = null;
  if (status?.connected) {
    try {
      listingsResult = await getEbayListings(organization.id);
    } catch (error) {
      listingsError = error instanceof Error ? error.message : "provider_unavailable";
    }
  }

  const inventoryItems: InventorySku[] = [
    ...(catalog?.items ?? []),
    ...catalogRest.flatMap((page) => page?.items ?? []),
  ];
  const inventoryUnits: InventoryUnit[] = [
    ...(units?.items ?? []),
    ...unitsRest.flatMap((page) => page?.items ?? []),
  ];
  const unitQuantities = new Map<string, number>();
  for (const item of inventoryUnits) {
    const sku = item.sku.toLowerCase();
    unitQuantities.set(sku, (unitQuantities.get(sku) ?? 0) + 1);
  }

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="integrations">
      <EbayIntegration
        tab={tab}
        organizationId={organization.id}
        organizationName={organization.name}
        inventorySummary={catalog && units ? { skuCount: catalog.total, unitCount: units.total } : null}
        status={status}
        statusError={statusResult.error}
        listings={listingsResult?.listings ?? []}
        listingsError={listingsError}
        listingsTruncated={listingsResult?.truncated ?? false}
        listingsFetchedAt={listingsResult?.fetchedAt ?? null}
        inventoryItems={inventoryItems}
        unitQuantities={Object.fromEntries(unitQuantities)}
        callbackStatus={callbackStatus}
        filters={{ q, listingStatus, connectionStatus, connectionType }}
        catalogTruncated={catalog ? catalog.total > inventoryItems.length : false}
        unitsTruncated={units ? units.total > inventoryUnits.length : false}
      />
    </WorkspaceShell>
  );
}
