import { redirect } from "next/navigation";

import { MarketplacePartnerGuide } from "../../../../components/marketplace-partner-guide";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { listOrganizations } from "../../../../lib/api";
import { session } from "../../../../lib/auth";

export default async function ReebeloIntegrationPage({
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

  const { tab } = await searchParams;
  return (
    <WorkspaceShell organizationName={organization.name} activeSection="integrations">
      <MarketplacePartnerGuide marketplace="reebelo" tab={tab} />
    </WorkspaceShell>
  );
}
