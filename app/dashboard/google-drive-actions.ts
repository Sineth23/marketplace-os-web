"use server";

import { redirect } from "next/navigation";

import { MarketplaceApiError, startGoogleDriveConnection } from "../../lib/api";

export async function connectGoogleDrive(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!organizationId) redirect("/dashboard?googleDrive=error");

  let authorizationUrl: string;
  try {
    authorizationUrl = (await startGoogleDriveConnection(organizationId)).authorizationUrl;
  } catch (error) {
    console.error(
      "Google Drive connection start failed",
      error instanceof MarketplaceApiError ? { status: error.status } : { type: "unknown" },
    );
    const code = error instanceof MarketplaceApiError ? error.message : "error";
    redirect(`/dashboard?googleDrive=${encodeURIComponent(code)}`);
  }

  redirect(authorizationUrl);
}
