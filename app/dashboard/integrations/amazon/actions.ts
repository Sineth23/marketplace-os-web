"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveAmazonSync,
  createAmazonSyncPreview,
  disconnectAmazonConnection,
  mapAmazonListing,
  refreshAmazonListings,
  startAmazonConnection,
} from "../../../../lib/api";

const path = "/dashboard/integrations/amazon";

export async function connectAmazonAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  let authorizationUrl: string;
  try {
    authorizationUrl = (await startAmazonConnection(organizationId)).authorizationUrl;
  } catch {
    redirect(`${path}?amazon=connect_unavailable`);
  }
  redirect(authorizationUrl);
}

export async function disconnectAmazonAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  try {
    await disconnectAmazonConnection(organizationId);
    revalidatePath(path);
  } catch {
    redirect(`${path}?amazon=disconnect_failed`);
  }
  redirect(`${path}?amazon=disconnected`);
}

export async function refreshAmazonListingsAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  try {
    await refreshAmazonListings(organizationId);
    revalidatePath(path);
  } catch {
    redirect(`${path}?tab=listings&amazon=refresh_failed`);
  }
  redirect(`${path}?tab=listings&amazon=refreshed`);
}

export async function mapAmazonListingAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const inventorySkuId = String(formData.get("inventorySkuId") ?? "");
  try {
    await mapAmazonListing(organizationId, listingId, inventorySkuId);
    revalidatePath(path);
  } catch {
    redirect(`${path}?tab=listings&amazon=mapping_failed`);
  }
  redirect(`${path}?tab=listings&amazon=mapping_saved`);
}

export async function previewAmazonSyncAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  let runId: string;
  try {
    const run = await createAmazonSyncPreview(organizationId);
    revalidatePath(path);
    runId = run.id;
  } catch {
    redirect(`${path}?tab=opportunities&amazon=preview_failed`);
  }
  redirect(`${path}?tab=opportunities&runId=${encodeURIComponent(runId)}&amazon=preview_ready`);
}

export async function approveAmazonSyncAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  try {
    await approveAmazonSync(organizationId, runId);
    revalidatePath(path);
  } catch {
    redirect(`${path}?tab=opportunities&runId=${encodeURIComponent(runId)}&amazon=sync_failed`);
  }
  redirect(`${path}?tab=opportunities&runId=${encodeURIComponent(runId)}&amazon=sync_submitted`);
}
