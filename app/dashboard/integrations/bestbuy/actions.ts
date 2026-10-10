"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MarketplaceApiError, disconnectBestBuy, saveBestBuyKey } from "../../../../lib/api";

const path = "/dashboard/integrations/bestbuy";

const knownErrors = new Set(["key_rejected", "invalid_request", "owner_required", "rate_limited"]);

/** The key arrives in the form body and goes straight to the API. It is never put in a redirect URL. */
export async function connectBestBuyAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const shopIdText = String(formData.get("shopId") ?? "").trim();
  const shopId = shopIdText ? Number(shopIdText) : undefined;
  if (!organizationId || !apiKey || (shopId !== undefined && (!Number.isInteger(shopId) || shopId <= 0))) {
    redirect(`${path}?bestbuy=invalid_request`);
  }
  let outcome = "connected";
  try {
    await saveBestBuyKey(organizationId, { apiKey, shopId });
    revalidatePath(path);
  } catch (error) {
    const code = error instanceof MarketplaceApiError ? error.message : "error";
    outcome = knownErrors.has(code) ? code : "error";
  }
  redirect(`${path}?bestbuy=${outcome}`);
}

export async function disconnectBestBuyAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  let outcome = "disconnected";
  try {
    await disconnectBestBuy(organizationId);
    revalidatePath(path);
  } catch (error) {
    outcome =
      error instanceof MarketplaceApiError && error.message === "owner_required" ? "owner_required" : "error";
  }
  redirect(`${path}?bestbuy=${outcome}`);
}
