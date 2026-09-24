import Link from "next/link";
import { redirect } from "next/navigation";

import { ScanReportImportForm } from "../../../components/scan-report-import-form";
import { WorkspaceShell } from "../../../components/workspace-shell";
import {
  getLatestScanReport,
  getScanReportPreview,
  listOrganizations,
  listScanReportHistory,
} from "../../../lib/api";
import type { ScanInventoryItem, ScanResultRow } from "../../../lib/api";
import { session } from "../../../lib/auth";

type Params = Readonly<Record<string, string | undefined>>;

function unique(values: readonly (string | undefined)[]): string[] {
  return [
    ...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  ].sort();
}

function duplicateRows<T extends ScanResultRow | ScanInventoryItem>(rows: readonly T[]): Set<number> {
  const identifiers = new Map<string, number[]>();
  for (const row of rows) {
    for (const [kind, value] of [
      ["id", row.sourceUnitId],
      ["serial", row.serialNumber],
    ] as const) {
      const normalized = value?.trim().toUpperCase();
      if (!normalized) continue;
      const key = `${kind}:${normalized}`;
      const rowNumbers = identifiers.get(key) ?? [];
      rowNumbers.push(row.rowNumber);
      identifiers.set(key, rowNumbers);
    }
  }
  return new Set([...identifiers.values()].filter((rowNumbers) => rowNumbers.length > 1).flat());
}

export default async function ScanReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await session())) redirect("/");
  const organizations = await listOrganizations().catch(() => redirect("/?signIn=expired"));
  const organization = organizations[0];
  if (!organization) redirect("/dashboard");
  const params = await searchParams;
  const [latest, pending, selectedReport, history] = await Promise.all([
    getLatestScanReport(organization.id).catch(() => null),
    params.reviewBatch ? getScanReportPreview(organization.id, params.reviewBatch).catch(() => null) : null,
    params.reportId ? getScanReportPreview(organization.id, params.reportId).catch(() => null) : null,
    listScanReportHistory(organization.id).catch(() => []),
  ]);
  const review = pending?.status === "preview" ? pending : null;
  const report =
    selectedReport?.status === "approved"
      ? selectedReport
      : pending?.status === "approved"
        ? pending
        : latest;
  const tab = params.tab === "items" ? "items" : "results";
  const q = params.q?.trim().toLowerCase() ?? "";
  const resultFilter = params.result ?? "All";
  const grade = params.grade ?? "";
  const status = params.status ?? "";
  const location = params.location ?? "";
  const unitId = params.unitId?.trim().toLowerCase() ?? "";
  const serial = params.serial?.trim().toLowerCase() ?? "";
  const manufacturer = params.manufacturer ?? "";
  const model = params.model ?? "";
  const variant = params.variant ?? "";
  const network = params.network ?? "";
  const capacity = params.capacity ?? "";
  const color = params.color ?? "";
  const scanStatus = params.scanStatus ?? "any";
  const condition = params.condition ?? "any";
  const results = report?.results ?? [];
  const items = report?.inventoryItems ?? [];
  const duplicateResultRows = duplicateRows(results);
  const duplicateItemRows = duplicateRows(items);
  const filteredResults = results.filter((row) => {
    const fields = [
      row.scan,
      row.result,
      row.manufacturer,
      row.model,
      row.variant,
      row.network,
      row.capacity,
      row.color,
      row.grade,
      row.conditions,
      row.serialNumber,
      row.sourceUnitId,
      row.status,
      row.location,
      row.scannedBy,
    ];
    return (
      (!q || fields.some((field) => field?.toLowerCase().includes(q))) &&
      (resultFilter === "All" || resultFilter === "Duplicate" || row.result === resultFilter) &&
      (!manufacturer || row.manufacturer === manufacturer) &&
      (!model || row.model === model) &&
      (!variant || row.variant === variant) &&
      (!network || row.network === network) &&
      (!capacity || row.capacity === capacity) &&
      (!color || row.color === color) &&
      (!grade || row.grade === grade) &&
      (!status || row.status === status) &&
      (!location || row.location === location) &&
      (!unitId || row.sourceUnitId?.toLowerCase().includes(unitId)) &&
      (!serial || row.serialNumber?.toLowerCase().includes(serial)) &&
      (condition === "any" ||
        (condition === "recorded" ? Boolean(row.conditions?.trim()) : !row.conditions?.trim())) &&
      (resultFilter !== "Duplicate" || duplicateResultRows.has(row.rowNumber))
    );
  });
  const auditedIds = new Set(
    results
      .filter((row) => row.result === "Audited")
      .flatMap((row) => [row.sourceUnitId, row.serialNumber].map((value) => value?.trim().toUpperCase()))
      .filter(Boolean),
  );
  const filteredItems = items.filter((row) => {
    const fields = [
      row.device,
      row.grade,
      row.damages,
      row.sourceUnitId,
      row.serialNumber,
      row.status,
      row.location,
      row.scannedBy,
    ];
    const scanned = [row.sourceUnitId, row.serialNumber].some((value) =>
      Boolean(value && auditedIds.has(value.trim().toUpperCase())),
    );
    const device = row.device.toLowerCase();
    return (
      (!q || fields.some((field) => field?.toLowerCase().includes(q))) &&
      (resultFilter === "All" || (resultFilter === "Duplicate" && duplicateItemRows.has(row.rowNumber))) &&
      (!grade || row.grade === grade) &&
      (!status || row.status === status) &&
      (!location || row.location === location) &&
      (!unitId || row.sourceUnitId?.toLowerCase().includes(unitId)) &&
      (!serial || row.serialNumber?.toLowerCase().includes(serial)) &&
      (!manufacturer || device.includes(manufacturer.toLowerCase())) &&
      (!model || device.includes(model.toLowerCase())) &&
      (!variant || device.includes(variant.toLowerCase())) &&
      (!network || device.includes(network.toLowerCase())) &&
      (!capacity || device.includes(capacity.toLowerCase())) &&
      (!color || device.includes(color.toLowerCase())) &&
      (scanStatus === "any" || (scanStatus === "scanned" ? scanned : !scanned)) &&
      (condition === "any" ||
        (condition === "recorded" ? Boolean(row.damages?.trim()) : !row.damages?.trim()))
    );
  });

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="scan-reports">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">WholeCell operations</p>
          <h1>Scan Reports</h1>
          <p>Review paired exports. Saving a report does not change WholeCell or serialized inventory.</p>
        </div>
        <Link className="quiet-button" href="/dashboard/inventory">
          View inventory
        </Link>
      </section>
      <section className="dashboard-section" aria-labelledby="scan-import-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Reviewed intake</p>
            <h2 id="scan-import-title">Import a paired report</h2>
          </div>
        </div>
        <ScanReportImportForm organizationId={organization.id} initialBatch={review} />
      </section>
      {report ? (
        <>
          <section className="dashboard-section scan-history" aria-labelledby="scan-history-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Saved reports</p>
                <h2 id="scan-history-title">Report history</h2>
              </div>
              <span>{history.length} approved snapshots</span>
            </div>
            <div className="scan-history-list">
              {history.map((item) => (
                <Link
                  className={item.id === report.id ? "selected" : ""}
                  href={`?reportId=${encodeURIComponent(item.id)}&tab=${tab}`}
                  key={item.id}
                >
                  <strong>{item.resultsFileName}</strong>
                  <span>
                    {item.createdAt.slice(0, 10)} · {item.summary.expectedCount} expected ·{" "}
                    {item.summary.auditedCount} audited
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section className="scan-summary-grid" aria-label="Latest scan report summary">
            <article>
              <span>Expected</span>
              <strong>{report.summary.expectedCount.toLocaleString()}</strong>
              <small>{report.inventoryFileName}</small>
            </article>
            <article>
              <span>Audited</span>
              <strong>{report.summary.auditedCount.toLocaleString()}</strong>
              <small>Scan Results</small>
            </article>
            <article>
              <span>Remaining</span>
              <strong>{report.summary.remainingCount.toLocaleString()}</strong>
              <small>Clamped at zero</small>
            </article>
            <article>
              <span>Overage / duplicates</span>
              <strong>
                {report.summary.overageCount} / {report.summary.duplicateCount}
              </strong>
              <small>Review local exceptions</small>
            </article>
            <article>
              <span>Last scanned</span>
              <strong>{report.summary.lastScannedAt ?? "—"}</strong>
              <small>{report.summary.locations.join(", ") || "No locations"}</small>
            </article>
          </section>
          <section className="dashboard-section" aria-labelledby="scan-records-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Approved snapshot</p>
                <h2 id="scan-records-title">{report.resultsFileName}</h2>
              </div>
              <span>
                {report.summary.resultCounts.Audited} audited · {report.summary.resultCounts["Not Expected"]}{" "}
                not expected · {report.summary.resultCounts["Not Found"]} not found
              </span>
            </div>
            <nav className="scan-tabs" aria-label="Report dataset">
              <Link
                className={tab === "results" ? "selected" : ""}
                href={`?reportId=${encodeURIComponent(report.id)}&tab=results`}
              >
                Scan Results ({results.length})
              </Link>
              <Link
                className={tab === "items" ? "selected" : ""}
                href={`?reportId=${encodeURIComponent(report.id)}&tab=items`}
              >
                Inventory Items ({items.length})
              </Link>
            </nav>
            <form className="scan-filter-panel" method="get">
              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="reportId" value={report.id} />
              <label>
                Search
                <input name="q" defaultValue={params.q} placeholder="Product, SKU, ID, ESN" />
              </label>
              <label>
                WholeCell ID
                <input name="unitId" defaultValue={params.unitId} />
              </label>
              <label>
                Serial / ESN
                <input name="serial" defaultValue={params.serial} />
              </label>
              {(
                [
                  ["manufacturer", "Manufacturer", unique(results.map((r) => r.manufacturer))],
                  ["model", "Model", unique(results.map((r) => r.model))],
                  ["variant", "Variant", unique(results.map((r) => r.variant))],
                  ["network", "Network", unique(results.map((r) => r.network))],
                  ["capacity", "Capacity", unique(results.map((r) => r.capacity))],
                  ["color", "Color", unique(results.map((r) => r.color))],
                  ["grade", "Grade", unique([...results.map((r) => r.grade), ...items.map((r) => r.grade)])],
                  [
                    "status",
                    "Status",
                    unique([...results.map((r) => r.status), ...items.map((r) => r.status)]),
                  ],
                  [
                    "location",
                    "Location",
                    unique([...results.map((r) => r.location), ...items.map((r) => r.location)]),
                  ],
                ] as const
              ).map(([name, label, options]) => (
                <label key={name}>
                  {label}
                  <select name={name} defaultValue={params[name]}>
                    <option value="">All</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                {tab === "results" ? "Result" : "Review"}
                <select name="result" defaultValue={resultFilter}>
                  {(tab === "results"
                    ? ["All", "Audited", "Not Expected", "Not Found", "Duplicate"]
                    : ["All", "Duplicate"]
                  ).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              {tab === "items" ? (
                <label>
                  Scan status
                  <select name="scanStatus" defaultValue={scanStatus}>
                    <option value="any">Any</option>
                    <option value="scanned">Scanned</option>
                    <option value="not-scanned">Not scanned</option>
                  </select>
                </label>
              ) : null}
              <label>
                Conditions
                <select name="condition" defaultValue={condition}>
                  <option value="any">Any</option>
                  <option value="recorded">Recorded</option>
                  <option value="blank">Blank</option>
                </select>
              </label>
              <button className="primary-button" type="submit">
                Apply filters
              </button>
            </form>
            <p className="scan-row-count">
              Showing {(tab === "items" ? filteredItems : filteredResults).length} rows
            </p>
            <div className="inventory-table-wrap">
              {tab === "results" ? (
                <table className="inventory-table scan-report-table">
                  <thead>
                    <tr>
                      <th>Result</th>
                      <th>Product</th>
                      <th>Grade</th>
                      <th>Conditions</th>
                      <th>ID</th>
                      <th>ESN</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Scanned at</th>
                      <th>Scanned by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>
                          {row.result}
                          {duplicateResultRows.has(row.rowNumber) ? " · Duplicate" : ""}
                        </td>
                        <td>
                          <strong>
                            {[row.manufacturer, row.model].filter(Boolean).join(" ") ||
                              "Product details unavailable"}
                          </strong>
                          <small>
                            {[row.variant, row.network, row.capacity, row.color].filter(Boolean).join(" · ")}
                          </small>
                        </td>
                        <td>{row.grade ?? "—"}</td>
                        <td>{row.conditions ?? "—"}</td>
                        <td>{row.sourceUnitId ?? "—"}</td>
                        <td>{row.serialNumber ?? "—"}</td>
                        <td>{row.status ?? "—"}</td>
                        <td>{row.location ?? "—"}</td>
                        <td>{row.scannedAt ?? "—"}</td>
                        <td>{row.scannedBy ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="inventory-table scan-report-table">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Grade</th>
                      <th>Damages</th>
                      <th>ID</th>
                      <th>ESN</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Scanned at</th>
                      <th>Scanned by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>
                          {row.device}
                          {duplicateItemRows.has(row.rowNumber) ? " · Duplicate" : ""}
                        </td>
                        <td>{row.grade ?? "—"}</td>
                        <td>{row.damages ?? "—"}</td>
                        <td>{row.sourceUnitId ?? "—"}</td>
                        <td>{row.serialNumber ?? "—"}</td>
                        <td>{row.status ?? "—"}</td>
                        <td>{row.location ?? "—"}</td>
                        <td>{row.scannedAt ?? "—"}</td>
                        <td>{row.scannedBy ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <small className="scan-report-footnote">
              Blank condition values do not mean a device is functional. Functionality is not available in
              these exports.
            </small>
          </section>
        </>
      ) : (
        <section className="empty-workspace">
          <h2>No approved scan report yet</h2>
          <p>Select the two matching WholeCell exports, review the saved preview, then approve it.</p>
        </section>
      )}
    </WorkspaceShell>
  );
}
