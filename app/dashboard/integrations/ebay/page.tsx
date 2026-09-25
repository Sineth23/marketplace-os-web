import { redirect } from "next/navigation";

import { EbayIntegration } from "../../../../components/ebay-integration";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { listInventory, listInventoryUnits, listOrganizations } from "../../../../lib/api";
import { session } from "../../../../lib/auth";

export default async function EbayIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!(await session())) redirect("/");

  let organizations;
  try {
    organizations = await listOrganizations();
  } catch {
    redirect("/?signIn=expired");
  }

  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const [catalog, units, { tab }] = await Promise.all([
    listInventory(organization.id).catch(() => null),
    listInventoryUnits(organization.id).catch(() => null),
    searchParams,
  ]);

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="integrations">
      <EbayIntegration
        tab={tab}
        organizationName={organization.name}
        inventorySummary={catalog && units ? { skuCount: catalog.total, unitCount: units.total } : null}
      />
    </WorkspaceShell>
  );
}
