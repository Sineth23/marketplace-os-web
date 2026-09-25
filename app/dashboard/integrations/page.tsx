import { redirect } from "next/navigation";

import { IntegrationDirectory } from "../../../components/integration-directory";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { getGoogleDriveStatus, listOrganizations } from "../../../lib/api";
import { session } from "../../../lib/auth";

export default async function IntegrationsPage() {
  if (!(await session())) redirect("/");

  let organizations;
  try {
    organizations = await listOrganizations();
  } catch {
    redirect("/?signIn=expired");
  }

  const organization = organizations[0];
  if (!organization) redirect("/dashboard");

  const driveStatus = await getGoogleDriveStatus(organization.id).catch(() => null);

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="integrations">
      <IntegrationDirectory
        organizationId={organization.id}
        organizationName={organization.name}
        driveStatus={driveStatus}
      />
    </WorkspaceShell>
  );
}
