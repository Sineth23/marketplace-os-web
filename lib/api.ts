import { oauthConfiguration, session } from "./auth";

export type Organization = Readonly<{ id: string; name: string; role: "owner" | "member" }>;
export type InventoryImportRow = Readonly<{
  rowNumber: number;
  sku: string;
  manufacturer?: string | undefined;
  model?: string | undefined;
  variant?: string | undefined;
  network?: string | undefined;
  capacity?: string | undefined;
  color?: string | undefined;
  grade?: string | undefined;
  damages?: string | undefined;
}>;
export type InventoryImportResult = Readonly<{
  importedCount: number;
  updatedCount: number;
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
}>;
export type InventorySku = Readonly<{
  id: string;
  sourceSku: string;
  manufacturer: string | null;
  model: string | null;
  variant: string | null;
  network: string | null;
  capacity: string | null;
  color: string | null;
  grade: string | null;
  damages: string | null;
}>;

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

export async function importInventory(
  organizationId: string,
  rows: readonly InventoryImportRow[],
): Promise<InventoryImportResult> {
  const response = await request(`/v1/organizations/${organizationId}/inventory-imports`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!response.ok) throw new Error("Unable to import inventory.");
  const body = (await response.json()) as { result?: InventoryImportResult };
  if (!body.result) throw new Error("Invalid inventory import response.");
  return body.result;
}

export async function listInventory(
  organizationId: string,
  page = 1,
  search = "",
): Promise<Readonly<{ items: readonly InventorySku[]; total: number }>> {
  const query = new URLSearchParams({ page: String(page), ...(search ? { search } : {}) });
  const response = await request(`/v1/organizations/${organizationId}/inventory-skus?${query}`);
  if (!response.ok) throw new Error("Unable to load inventory.");
  return response.json() as Promise<{ items: InventorySku[]; total: number }>;
}
