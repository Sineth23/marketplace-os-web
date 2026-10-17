import { redirect } from "next/navigation";

import { ReebeloIntegration } from "../../../../components/reebelo-integration";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import {
  MarketplaceApiError,
  getReebeloOffers,
  getReebeloStatus,
  listOrganizations,
  type ReebeloConnectionStatus,
  type ReebeloOffersResponse,
} from "../../../../lib/api";
import { session } from "../../../../lib/auth";

export default async function ReebeloIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    organizationId?: string;
    reebelo?: string;
    state?: string;
    q?: string;
  }>;
}) {
  if (!(await session())) redirect("/");

  let organizations;
  try {
    organizations = await listOrganizations();
  } catch {
    redirect("/?signIn=expired");
  }

  const { tab, organizationId, reebelo: callbackStatus, state, q } = await searchParams;
  const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0];
  if (!organization) redirect("/dashboard");

  const statusResult = await getReebeloStatus(organization.id)
    .then((status) => ({ status, error: null as string | null }))
    .catch(() => ({ status: null as ReebeloConnectionStatus | null, error: "status_unavailable" }));
  const status = statusResult.status;

  // Offers are read live from Reebelo only when the Listings tab is open.
  const offers =
    tab === "listings" && status?.connected
      ? await getReebeloOffers(organization.id)
          .then((result) => ({ result, error: null as string | null }))
          .catch((error: unknown) => ({
            result: null as ReebeloOffersResponse | null,
            error: error instanceof MarketplaceApiError ? error.message : "provider_unavailable",
          }))
      : { result: null as ReebeloOffersResponse | null, error: null as string | null };

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="integrations">
      <ReebeloIntegration
        tab={tab}
        organizationId={organization.id}
        organizationName={organization.name}
        isOwner={organization.role === "owner"}
        status={status}
        statusError={statusResult.error}
        offers={offers.result?.offers ?? []}
        offersTotal={offers.result?.total ?? 0}
        offersError={offers.error}
        offersTruncated={offers.result?.truncated ?? false}
        offersFetchedAt={offers.result?.fetchedAt ?? null}
        callbackStatus={callbackStatus}
        stateFilter={state}
        query={q}
      />
    </WorkspaceShell>
  );
}
