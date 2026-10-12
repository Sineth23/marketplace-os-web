"use server";

import { redirect } from "next/navigation";
import { disconnectEbayConnection, MarketplaceApiError, startEbayConnection } from "../../lib/api";

export async function connectEbay(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!organizationId) redirect("/dashboard/integrations/ebay?ebay=error");
  let authorizationUrl = "";
  try {
    authorizationUrl = (await startEbayConnection(organizationId)).authorizationUrl;
  } catch (error) {
    const code = error instanceof MarketplaceApiError ? error.message : "error";
    redirect(`/dashboard/integrations/ebay?ebay=${encodeURIComponent(code)}`);
  }
  redirect(authorizationUrl);
}

export async function disconnectEbay(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!organizationId) redirect("/dashboard/integrations/ebay?ebay=error");
  const base = `/dashboard/integrations/ebay?organizationId=${encodeURIComponent(organizationId)}`;
  try {
    await disconnectEbayConnection(organizationId);
  } catch (error) {
    const owner = error instanceof MarketplaceApiError && error.message === "owner_required";
    redirect(`${base}&ebay=${owner ? "owner_required" : "disconnect_failed"}`);
  }
  redirect(`${base}&ebay=disconnected`);
}
