"use server";

import { redirect } from "next/navigation";
import { MarketplaceApiError, startEbayConnection } from "../../lib/api";

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
