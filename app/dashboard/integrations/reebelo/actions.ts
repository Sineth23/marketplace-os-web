"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MarketplaceApiError, disconnectReebelo, saveReebeloKey } from "../../../../lib/api";

const path = "/dashboard/integrations/reebelo";

const knownErrors = new Set(["key_rejected", "invalid_request", "owner_required", "rate_limited"]);

/** The key arrives in the form body and goes straight to the API. It is never put in a redirect URL. */
export async function connectReebeloAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!organizationId || !apiKey) redirect(`${path}?reebelo=invalid_request`);
  let outcome = "connected";
  try {
    await saveReebeloKey(organizationId, { apiKey });
    revalidatePath(path);
  } catch (error) {
    const code = error instanceof MarketplaceApiError ? error.message : "error";
    outcome = knownErrors.has(code) ? code : "error";
  }
  redirect(`${path}?reebelo=${outcome}`);
}

export async function disconnectReebeloAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  let outcome = "disconnected";
  try {
    await disconnectReebelo(organizationId);
    revalidatePath(path);
  } catch (error) {
    outcome =
      error instanceof MarketplaceApiError && error.message === "owner_required" ? "owner_required" : "error";
  }
  redirect(`${path}?reebelo=${outcome}`);
}
