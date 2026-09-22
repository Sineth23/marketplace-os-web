"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  driveRequest,
  autoGroupGoogleDriveSnapshot,
  groupGoogleDriveSnapshot,
  searchAndGroupGoogleDriveSnapshot,
  setGoogleDriveFolder,
  startGoogleDriveConnection,
  startGoogleDriveBulkSearch,
  type DriveSnapshot,
} from "../../../lib/api";

function organization(form: FormData) {
  const id = form.get("organizationId");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid organization.");
  return id;
}
function location(id: string, values: Record<string, string> = {}) {
  return `/dashboard/google-drive?${new URLSearchParams({ organizationId: id, ...values })}`;
}
function returnLocation(id: string, form: FormData, snapshotId: string) {
  const view = form.get("view");
  return view === "organize"
    ? `/dashboard/google-drive/organize?${new URLSearchParams({
        organizationId: id,
        snapshot: snapshotId,
        ...(typeof form.get("sku") === "string" && form.get("sku")
          ? { focusSku: String(form.get("sku")) }
          : {}),
      })}`
    : location(id, { snapshot: snapshotId });
}
export async function selectSource(form: FormData) {
  const id = organization(form);
  const folder = form.get("folderId");
  try {
    await setGoogleDriveFolder(id, typeof folder === "string" && folder ? folder : null);
  } catch {
    redirect(location(id, { error: "source" }));
  }
  revalidatePath("/dashboard");
  redirect(location(id));
}
export async function previewSource(form: FormData) {
  const id = organization(form);
  let snapshot: DriveSnapshot;
  try {
    snapshot = await driveRequest<DriveSnapshot>(id, "/preview", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch (error) {
    redirect(location(id, { error: error instanceof Error ? error.message : "preview" }));
  }
  redirect(location(id, { snapshot: snapshot.id }));
}
export async function confirmSnapshot(form: FormData) {
  const id = organization(form);
  const snapshotId = form.get("snapshotId");
  if (form.get("confirmed") !== "on" || typeof snapshotId !== "string")
    redirect(location(id, { error: "confirmation" }));
  try {
    await driveRequest(id, `/snapshots/${encodeURIComponent(snapshotId)}/confirm`, {
      method: "POST",
      body: JSON.stringify({ confirmed: true }),
    });
  } catch (error) {
    redirect(location(id, { error: error instanceof Error ? error.message : "confirm" }));
  }
  redirect(returnLocation(id, form, snapshotId));
}
export async function groupSnapshot(form: FormData) {
  const id = organization(form);
  const snapshotId = form.get("snapshotId");
  if (typeof snapshotId !== "string") redirect(location(id, { error: "grouping" }));
  const annotations: { fileId: string; sku: string | null }[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("sticker_") || value !== "on") continue;
    const fileId = key.slice("sticker_".length);
    const sku = form.get(`sku_${fileId}`);
    annotations.push({ fileId, sku: typeof sku === "string" && sku.trim() ? sku.trim() : null });
  }
  try {
    await groupGoogleDriveSnapshot(id, snapshotId, annotations);
  } catch (error) {
    redirect(
      location(id, { snapshot: snapshotId, error: error instanceof Error ? error.message : "grouping" }),
    );
  }
  revalidatePath("/dashboard/google-drive");
  redirect(returnLocation(id, form, snapshotId));
}
export async function autoGroupSnapshot(form: FormData) {
  const id = organization(form);
  const snapshotId = form.get("snapshotId");
  if (typeof snapshotId !== "string") redirect(location(id, { error: "grouping" }));
  try {
    await autoGroupGoogleDriveSnapshot(id, snapshotId);
  } catch (error) {
    redirect(
      location(id, { snapshot: snapshotId, error: error instanceof Error ? error.message : "grouping" }),
    );
  }
  revalidatePath("/dashboard/google-drive");
  redirect(returnLocation(id, form, snapshotId));
}
export async function searchSkuSnapshot(form: FormData) {
  const id = organization(form);
  const snapshotId = form.get("snapshotId");
  const sku = form.get("sku");
  if (typeof snapshotId !== "string" || typeof sku !== "string" || !sku.trim())
    redirect(location(id, { error: "grouping" }));
  try {
    await searchAndGroupGoogleDriveSnapshot(id, snapshotId, sku.trim());
  } catch (error) {
    redirect(
      location(id, { snapshot: snapshotId, error: error instanceof Error ? error.message : "grouping" }),
    );
  }
  revalidatePath("/dashboard/google-drive");
  redirect(returnLocation(id, form, snapshotId));
}
export async function searchEntireDrive(form: FormData) {
  const id = organization(form);
  const sku = form.get("sku");
  if (typeof sku !== "string" || !sku.trim()) redirect(location(id, { error: "search" }));
  revalidatePath("/dashboard/google-drive");
  redirect(location(id, { directSku: sku.trim() }));
}
export async function searchAllSkus(form: FormData) {
  const id = organization(form);
  let jobId: string;
  try {
    const job = await startGoogleDriveBulkSearch(id);
    jobId = job.id;
  } catch (error) {
    redirect(location(id, { error: error instanceof Error ? error.message : "drive_unavailable" }));
  }
  revalidatePath("/dashboard/google-drive");
  redirect(location(id, { bulkJobId: jobId! }));
}
export async function disconnectDrive(form: FormData) {
  const id = organization(form);
  if (form.get("confirmed") !== "on") redirect(location(id, { error: "confirmation" }));
  let destination = location(id);
  try {
    await driveRequest(id, "/disconnect", { method: "POST" });
    if (form.get("reconnect") === "yes")
      destination = (await startGoogleDriveConnection(id)).authorizationUrl;
  } catch {
    redirect(location(id, { error: "disconnect" }));
  }
  revalidatePath("/dashboard");
  redirect(destination);
}
