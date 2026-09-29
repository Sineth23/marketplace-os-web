import { redirect } from "next/navigation";

import { AmazonIntegration } from "../../../../components/amazon-integration";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import {
  getAmazonStatus,
  getAmazonSyncRun,
  listAmazonListings,
  listInventory,
  listOrganizations,
} from "../../../../lib/api";
import { session } from "../../../../lib/auth";

export default async function AmazonIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; runId?: string; amazon?: string }>;
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

  const { tab, runId, amazon } = await searchParams;
  const amazonStatus = await getAmazonStatus(organization.id).catch(() => null);
  const listings =
    amazonStatus?.connected && tab === "listings"
      ? await listAmazonListings(organization.id).catch(() => null)
      : null;
  const inventory =
    amazonStatus?.connected && tab === "listings"
      ? await listInventory(organization.id).catch(() => ({ items: [], total: 0 }))
      : { items: [], total: 0 };
  const syncRun =
    amazonStatus?.connected && runId
      ? await getAmazonSyncRun(organization.id, runId).catch(() => null)
      : null;

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="integrations">
      <AmazonIntegration
        tab={tab ?? "details"}
        organizationId={organization.id}
        organizationRole={organization.role}
        amazon={amazonStatus}
        listings={listings}
        inventorySkus={inventory.items}
        syncRun={syncRun}
        notice={amazon}
      />
    </WorkspaceShell>
  );
}
