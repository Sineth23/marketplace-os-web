"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOrganization } from "../../lib/api";

export async function createOrganizationAction(formData: FormData): Promise<void> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) redirect("/dashboard?error=organization-name");
  try {
    await createOrganization(name);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthenticated") redirect("/");
    redirect("/dashboard?error=create-organization");
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
