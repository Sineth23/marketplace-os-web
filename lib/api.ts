import { oauthConfiguration, session } from "./auth";

export type Organization = Readonly<{ id: string; name: string; role: "owner" | "member" }>;

async function request(path: string, init?: RequestInit): Promise<Response> {
  const activeSession = await session();
  if (!activeSession) throw new Error("unauthenticated");
  return fetch(new URL(path, oauthConfiguration().apiOrigin), {
    ...init,
    headers: { authorization: `Bearer ${activeSession.accessToken}`, ...init?.headers },
    cache: "no-store",
  });
}

export async function listOrganizations(): Promise<readonly Organization[]> {
  const response = await request("/v1/organizations");
  if (!response.ok) throw new Error("Unable to load organizations.");
  const result = (await response.json()) as { organizations?: Organization[] };
  return result.organizations ?? [];
}

export async function createOrganization(name: string): Promise<Organization> {
  const response = await request("/v1/organizations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Unable to create organization.");
  const result = (await response.json()) as { organization?: Organization };
  if (!result.organization) throw new Error("Invalid organization response.");
  return result.organization;
}
