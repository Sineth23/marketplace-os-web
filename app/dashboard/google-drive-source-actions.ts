"use server";

import { redirect } from "next/navigation";

import { setGoogleDriveFolder } from "../../lib/api";

export async function useEntireDrive(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!organizationId) redirect("/dashboard?googleDrive=error");
  try {
    await setGoogleDriveFolder(organizationId, null);
  } catch {
    redirect("/dashboard?googleDrive=error");
  }
  redirect("/dashboard?googleDrive=source-saved");
}
