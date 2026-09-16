import { redirect } from "next/navigation";
import { listOrganizations } from "../../lib/api";
import type { Organization } from "../../lib/api";
import { session } from "../../lib/auth";
import { createOrganizationAction } from "./actions";

export default async function DashboardPage() {
  if (!(await session())) redirect("/");
  let organizations: readonly Organization[] = [];
  try {
    organizations = await listOrganizations();
  } catch {
    redirect("/?signIn=expired");
  }
  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: 24 }}>
      <p className="eyebrow">Authenticated workspace</p>
      <h1>Your organization workspace</h1>
      {organizations.length === 0 ? (
        <>
          <p>Create the first client organization to begin its inventory setup.</p>
          <form action={createOrganizationAction}>
            <label htmlFor="name">Organization name</label>
            <input id="name" name="name" required maxLength={160} />
            <button type="submit">Create organization</button>
          </form>
        </>
      ) : (
        <>
          <p>Select an organization to continue.</p>
          <ul>
            {organizations.map((organization) => (
              <li key={organization.id}>
                <strong>{organization.name}</strong> · {organization.role}
              </li>
            ))}
          </ul>
        </>
      )}
      <form action="/api/auth/sign-out" method="post">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
