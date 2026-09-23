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
  sourceUnitId?: string | undefined;
  serialNumber?: string | undefined;
  location?: string | undefined;
  status?: string | undefined;
  damageNotes?: string | undefined;
}>;
export type InventoryImportResult = Readonly<{
  importedCount: number;
  updatedCount: number;
  unitsCreated?: number;
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
}>;
export type InventoryImportBatch = Readonly<{
  id: string;
  status: "preview" | "approved";
  rowCount: number;
  skuCount: number;
  unitCount: number;
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[];
  result: InventoryImportResult | null;
}>;
export type InventoryUnit = Readonly<{
  id: string;
  skuId: string;
  sku: string;
  serialNumber: string | null;
  grade: string | null;
  damageNotes: string | null;
  location: string | null;
  status: string | null;
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

export type GoogleDriveConnectionStart = Readonly<{ authorizationUrl: string }>;
export type GoogleDriveConnectionStatus = Readonly<{
  connected: boolean;
  disconnectPending?: boolean;
  providerAccountEmail: string | null;
  folderId: string | null;
}>;

export type DriveSnapshot = {
  id: string;
  folderId: string | null;
  count: number;
  sample: { id: string; name: string; mimeType: string }[];
  files: { id: string; name: string; mimeType: string }[];
  startedAt: string;
  completedAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  groupedAt: string | null;
  grouping: DriveGroupingResult | null;
};
export type DrivePhotoGroup = Readonly<{
  ordinal: number;
  productFileIds: readonly string[];
  stickerFileId: string | null;
  sourceSku: string | null;
  status: "matched" | "needs_review" | "empty" | "unclosed";
  reason: string;
}>;
export type DriveGroupingResult = Readonly<{
  groups: readonly DrivePhotoGroup[];
  annotatedStickerCount: number;
  unannotatedFileCount: number;
}>;
export type DriveSearchResult = Readonly<{
  sku: string;
  scope: "entire_drive";
  files: readonly Readonly<{
    id: string;
    name: string;
    mimeType: string;
    createdTime: string;
    modifiedTime: string;
  }>[];
}>;
export type DriveBulkSearchResult = Readonly<{
  scope: "entire_drive";
  skuCount: number;
  matchedSkuCount: number;
  matches: readonly Readonly<{
    sku: string;
    matchCount: number;
    truncated: boolean;
    files: readonly Readonly<{
      id: string;
      name: string;
      mimeType: string;
      createdTime: string;
      modifiedTime: string;
    }>[];
  }>[];
}>;
export type DriveBulkSearchJob = Readonly<{
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  totalSkus: number;
  processedSkus: number;
  matchedSkuCount: number;
  errorCode: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  matches: readonly Readonly<{
    sourceSku: string;
    normalizedSku: string;
    matchCount: number;
    files: readonly Readonly<{
      id: string;
      name: string;
      mimeType: string;
      createdTime: string;
      modifiedTime: string;
    }>[];
  }>[];
}>;
export async function driveRequest<T>(
  organizationId: string,
  suffix: string,
  init?: RequestInit,
): Promise<T> {
  const response = await request(
    `/v1/organizations/${encodeURIComponent(organizationId)}/google-drive${suffix}`,
    {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return response.json() as Promise<T>;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const activeSession = await session();
  if (!activeSession) throw new Error("unauthenticated");
  return fetch(new URL(path, oauthConfiguration().apiOrigin), {
    ...init,
    headers: { authorization: `Bearer ${activeSession.accessToken}`, ...init?.headers },
    cache: "no-store",
  });
}

export class MarketplaceApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
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

export async function createInventoryPreview(
  organizationId: string,
  sourceFileName: string,
  rows: readonly InventoryImportRow[],
  rejected: readonly Readonly<{ rowNumber: number; message: string }>[],
): Promise<InventoryImportBatch> {
  const response = await request(`/v1/organizations/${organizationId}/inventory-imports/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceFileName, rows, rejected }),
  });
  if (!response.ok) throw new Error("Unable to create an inventory preview.");
  const body = (await response.json()) as { batch?: InventoryImportBatch };
  if (!body.batch) throw new Error("Invalid inventory preview response.");
  return body.batch;
}

export async function getInventoryPreview(
  organizationId: string,
  batchId: string,
): Promise<InventoryImportBatch> {
  const response = await request(
    `/v1/organizations/${organizationId}/inventory-imports/${encodeURIComponent(batchId)}`,
  );
  if (!response.ok) throw new Error("Unable to load this inventory preview.");
  const body = (await response.json()) as { batch?: InventoryImportBatch };
  if (!body.batch) throw new Error("Invalid inventory preview response.");
  return body.batch;
}

export async function approveInventoryImport(
  organizationId: string,
  batchId: string,
): Promise<InventoryImportBatch> {
  const response = await request(
    `/v1/organizations/${organizationId}/inventory-imports/${encodeURIComponent(batchId)}/approve`,
    { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
  );
  if (!response.ok) throw new Error("Unable to approve this inventory batch.");
  const body = (await response.json()) as { batch?: InventoryImportBatch };
  if (!body.batch) throw new Error("Invalid inventory approval response.");
  return body.batch;
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

export async function listInventoryUnits(
  organizationId: string,
  page = 1,
): Promise<Readonly<{ items: readonly InventoryUnit[]; total: number }>> {
  const query = new URLSearchParams({ page: String(page) });
  const response = await request(`/v1/organizations/${organizationId}/inventory-units?${query}`);
  if (!response.ok) throw new Error("Unable to load serialized inventory.");
  return response.json() as Promise<{ items: InventoryUnit[]; total: number }>;
}

export async function createInventorySku(
  organizationId: string,
  sku: Omit<InventoryImportRow, "rowNumber">,
): Promise<InventorySku> {
  const response = await request(`/v1/organizations/${organizationId}/inventory-skus`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sku),
  });
  if (!response.ok) throw new Error("Unable to create inventory SKU.");
  const body = (await response.json()) as { item?: InventorySku };
  if (!body.item) throw new Error("Invalid inventory SKU response.");
  return body.item;
}

export async function startGoogleDriveConnection(
  organizationId: string,
): Promise<GoogleDriveConnectionStart> {
  const response = await request(`/v1/organizations/${organizationId}/google-drive/connect`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  const body = (await response.json()) as Partial<GoogleDriveConnectionStart>;
  if (!body.authorizationUrl) throw new Error("Invalid Google Drive connection response.");
  return { authorizationUrl: body.authorizationUrl };
}

export async function getGoogleDriveStatus(organizationId: string): Promise<GoogleDriveConnectionStatus> {
  const response = await request(`/v1/organizations/${organizationId}/google-drive`);
  if (!response.ok) throw new MarketplaceApiError("Unable to load Google Drive status.", response.status);
  return (await response.json()) as GoogleDriveConnectionStatus;
}

export async function setGoogleDriveFolder(
  organizationId: string,
  folderId: string | null,
): Promise<GoogleDriveConnectionStatus> {
  const response = await request(`/v1/organizations/${organizationId}/google-drive`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ folderId }),
  });
  if (!response.ok) throw new MarketplaceApiError("Unable to save the Google Drive source.", response.status);
  return (await response.json()) as GoogleDriveConnectionStatus;
}

export async function groupGoogleDriveSnapshot(
  organizationId: string,
  snapshotId: string,
  annotations: readonly Readonly<{ fileId: string; sku: string | null }>[],
): Promise<DriveSnapshot> {
  const response = await request(
    `/v1/organizations/${organizationId}/google-drive/snapshots/${encodeURIComponent(snapshotId)}/group`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ annotations }),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveSnapshot;
}

export async function autoGroupGoogleDriveSnapshot(
  organizationId: string,
  snapshotId: string,
): Promise<DriveSnapshot> {
  const response = await request(
    `/v1/organizations/${organizationId}/google-drive/snapshots/${encodeURIComponent(snapshotId)}/group`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ automatic: true }),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveSnapshot;
}

export async function searchAndGroupGoogleDriveSnapshot(
  organizationId: string,
  snapshotId: string,
  sku: string,
): Promise<DriveSnapshot> {
  const response = await request(
    `/v1/organizations/${organizationId}/google-drive/snapshots/${encodeURIComponent(snapshotId)}/group`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sku }),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveSnapshot;
}

export async function searchGoogleDriveEntireDrive(
  organizationId: string,
  sku: string,
): Promise<DriveSearchResult> {
  const response = await request(
    `/v1/organizations/${organizationId}/google-drive/search?${new URLSearchParams({ sku })}`,
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveSearchResult;
}

export async function searchAllGoogleDriveSkus(organizationId: string): Promise<DriveBulkSearchResult> {
  const response = await request(`/v1/organizations/${organizationId}/google-drive/search-all`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveBulkSearchResult;
}

export async function startGoogleDriveBulkSearch(organizationId: string): Promise<DriveBulkSearchJob> {
  const response = await request(`/v1/organizations/${organizationId}/google-drive/search-all`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveBulkSearchJob;
}

export async function getGoogleDriveBulkSearch(
  organizationId: string,
  jobId: string,
): Promise<DriveBulkSearchJob> {
  const response = await request(
    `/v1/organizations/${organizationId}/google-drive/search-all/${encodeURIComponent(jobId)}`,
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveBulkSearchJob;
}

export async function getLatestGoogleDriveBulkSearch(
  organizationId: string,
): Promise<DriveBulkSearchJob | null> {
  const response = await request(`/v1/organizations/${organizationId}/google-drive/search-all/latest`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new MarketplaceApiError(body.error ?? "drive_unavailable", response.status);
  }
  return (await response.json()) as DriveBulkSearchJob | null;
}
