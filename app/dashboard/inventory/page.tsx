import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../components/workspace-shell";
import {
  listInventory,
  listInventoryUnits,
  listOrganizations,
  type InventorySku,
  type InventoryUnit,
} from "../../../lib/api";
import { session } from "../../../lib/auth";

type PricedInventoryUnit = Readonly<
  InventoryUnit & {
    skuInfo?: InventorySku | null;
  }
>;

function mergeUnitsWithSkus(
  units: readonly InventoryUnit[],
  skus: readonly InventorySku[],
): PricedInventoryUnit[] {
  const skuById = new Map<string, InventorySku>();
  for (const sku of skus) {
    skuById.set(sku.id, sku);
  }
  return units.map((unit) => ({
    ...unit,
    skuInfo: skuById.get(unit.skuId) ?? null,
  }));
}

function formatProduct(unit: PricedInventoryUnit): string {
  const sku = unit.skuInfo;
  const parts = [
    sku?.manufacturer ?? "",
    sku?.model ?? "",
    sku?.variant ?? "",
    `(${sku?.network ?? "—"}, ${sku?.capacity ?? "—"}, ${sku?.color ?? "—"})`,
  ].filter(Boolean);
  return parts.join(" ") || "—";
}

function formatSkuLabel(unit: PricedInventoryUnit): string {
  const sku = unit.skuInfo;
  const detail = sku ? `SKU: ${sku.sourceSku}` : unit.sku;
  return detail;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    manufacturer?: string;
    model?: string;
    variant?: string;
    network?: string;
    capacity?: string;
    color?: string;
    functionality?: string;
    grade?: string;
    esn?: string;
    status?: string;
    statusChangeBefore?: string;
    statusChangeAfter?: string;
    location?: string;
    inventoryDate?: string;
    customFieldSearch?: string;
    batteryHealthMin?: string;
    batteryHealthMax?: string;
    created?: string;
    stateUpdate?: string;
  }>;
}) {
  if (!(await session())) redirect("/");
  const organization = (await listOrganizations())[0];
  if (!organization) redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? "";

  const [inventory, units] = await Promise.all([
    listInventory(organization.id, page, search),
    listInventoryUnits(organization.id),
  ]);

  const merged = mergeUnitsWithSkus(units.items, inventory.items);

  // Apply client-side filters for fields not supported by the API
  const filtered = merged.filter((unit) => {
    const sku = unit.skuInfo;
    if (
      params.manufacturer &&
      sku?.manufacturer?.toLowerCase().includes(params.manufacturer.toLowerCase()) === false
    )
      return false;
    if (params.model && sku?.model?.toLowerCase().includes(params.model.toLowerCase()) === false)
      return false;
    if (params.variant && sku?.variant?.toLowerCase().includes(params.variant.toLowerCase()) === false)
      return false;
    if (params.network && sku?.network?.toLowerCase().includes(params.network.toLowerCase()) === false)
      return false;
    if (params.capacity && sku?.capacity?.toLowerCase().includes(params.capacity.toLowerCase()) === false)
      return false;
    if (params.color && sku?.color?.toLowerCase().includes(params.color.toLowerCase()) === false)
      return false;
    if (params.grade && unit.grade?.toLowerCase().includes(params.grade.toLowerCase()) === false)
      return false;
    if (params.esn && unit.serialNumber?.toLowerCase().includes(params.esn.toLowerCase()) === false)
      return false;
    if (params.status && unit.status?.toLowerCase().includes(params.status.toLowerCase()) === false)
      return false;
    if (params.location && unit.location?.toLowerCase().includes(params.location.toLowerCase()) === false)
      return false;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * 50 + 1;
  const end = Math.min(page * 50, total);
  const paginated = filtered.slice((page - 1) * 50, page * 50);

  const queryString = (() => {
    const qs = new URLSearchParams();
    if (params.manufacturer) qs.set("manufacturer", params.manufacturer);
    if (params.model) qs.set("model", params.model);
    if (params.variant) qs.set("variant", params.variant);
    if (params.network) qs.set("network", params.network);
    if (params.capacity) qs.set("capacity", params.capacity);
    if (params.color) qs.set("color", params.color);
    if (params.functionality) qs.set("functionality", params.functionality);
    if (params.grade) qs.set("grade", params.grade);
    if (params.esn) qs.set("esn", params.esn);
    if (params.status) qs.set("status", params.status);
    if (params.statusChangeBefore) qs.set("statusChangeBefore", params.statusChangeBefore);
    if (params.statusChangeAfter) qs.set("statusChangeAfter", params.statusChangeAfter);
    if (params.location) qs.set("location", params.location);
    if (params.inventoryDate) qs.set("inventoryDate", params.inventoryDate);
    if (params.customFieldSearch) qs.set("customFieldSearch", params.customFieldSearch);
    if (params.batteryHealthMin) qs.set("batteryHealthMin", params.batteryHealthMin);
    if (params.batteryHealthMax) qs.set("batteryHealthMax", params.batteryHealthMax);
    if (search) qs.set("search", search);
    return qs.toString();
  })();

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="inventory">
      <section className="inventory-page" aria-labelledby="inventory-title">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Device Mart Inventory</p>
            <h1 id="inventory-title">{organization.name} Inventory</h1>
          </div>
          <div className="inventory-header-actions">
            <Link className="primary-button" href="/dashboard/inventory/new">
              Add inventory
            </Link>
            <Link className="quiet-button" href="/dashboard">
              Back to setup
            </Link>
          </div>
        </div>

        {params.created === "1" ? <p className="form-message success-banner">Inventory SKU added.</p> : null}
        {params.stateUpdate ? (
          <p className="form-message">
            Availability state {params.stateUpdate === "saved" ? "saved." : "could not be saved."}
          </p>
        ) : null}

        <form className="inventory-filter-panel" method="get">
          <div className="filter-section">
            <p className="filter-section-title">Product</p>
            <div className="filter-grid">
              <label className="filter-label">Manufacturer</label>
              <select name="manufacturer" defaultValue={params.manufacturer ?? ""}>
                <option value="">Select option</option>
                <option value="Apple">Apple</option>
                <option value="Samsung">Samsung</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Sony">Sony</option>
                <option value="Dell">Dell</option>
                <option value="HP">HP</option>
                <option value="Acer">Acer</option>
              </select>

              <label className="filter-label">Model</label>
              <select name="model" defaultValue={params.model ?? ""}>
                <option value="">Select option</option>
              </select>

              <label className="filter-label">Variant</label>
              <select name="variant" defaultValue={params.variant ?? ""}>
                <option value="">Select option</option>
              </select>

              <label className="filter-label">Network</label>
              <select name="network" defaultValue={params.network ?? ""}>
                <option value="">Select option</option>
              </select>

              <label className="filter-label">Capacity</label>
              <select name="capacity" defaultValue={params.capacity ?? ""}>
                <option value="">Select option</option>
              </select>

              <label className="filter-label">Color</label>
              <select name="color" defaultValue={params.color ?? ""}>
                <option value="">Select option</option>
              </select>
            </div>
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Functionality</p>
            <div className="filter-radio-group">
              <label className="filter-radio">
                <input
                  type="radio"
                  name="functionality"
                  value="any"
                  defaultChecked={params.functionality === "any" || !params.functionality}
                />
                Any
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="functionality"
                  value="functional"
                  defaultChecked={params.functionality === "functional"}
                />
                Functional
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="functionality"
                  value="damaged"
                  defaultChecked={params.functionality === "damaged"}
                />
                Damaged
              </label>
            </div>
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Grade</p>
            <div className="filter-row">
              <select name="grade" defaultValue={params.grade ?? ""}>
                <option value="">Select option</option>
                <option value="A Grade">A Grade</option>
                <option value="B Grade">B Grade</option>
                <option value="C Grade">C Grade</option>
                <option value="D Grade">D Grade</option>
                <option value="BM Grade">BM Grade</option>
                <option value="CD Grade">CD Grade</option>
              </select>
              <div className="esn-toggle">
                <button className="quiet-button esn-toggle-btn">ESNs</button>
                <button className="quiet-button esn-toggle-btn">Hex ID</button>
              </div>
            </div>
            <textarea
              name="esn"
              rows={3}
              defaultValue={params.esn ?? ""}
              placeholder="ESN1\nESN2\nESN3\n..."
              className="esn-textarea"
            />
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Status</p>
            <select name="status" defaultValue={params.status ?? ""}>
              <option value="">Select option</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Sold">Sold</option>
              <option value="Unavailable">Unavailable</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Last Status Change</p>
            <div className="filter-date-row">
              <div>
                <label className="filter-label-small">Before</label>
                <input type="date" name="statusChangeBefore" defaultValue={params.statusChangeBefore ?? ""} />
              </div>
              <div>
                <label className="filter-label-small">After</label>
                <input type="date" name="statusChangeAfter" defaultValue={params.statusChangeAfter ?? ""} />
              </div>
              <button className="filter-time-btn">All Time</button>
              <button className="filter-time-btn">All Time</button>
            </div>
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Locations</p>
            <select name="location" defaultValue={params.location ?? ""}>
              <option value="">All Locations</option>
            </select>
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Inventory Date</p>
            <div className="filter-date-row">
              <input type="date" name="inventoryDate" defaultValue={params.inventoryDate ?? ""} />
              <button className="filter-time-btn">All Time</button>
            </div>
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Custom Field Search</p>
            <input
              name="customFieldSearch"
              defaultValue={params.customFieldSearch ?? ""}
              placeholder=""
              className="custom-field-input"
            />
          </div>

          <div className="filter-section">
            <p className="filter-section-title">Battery Health</p>
            <div className="filter-battery-row">
              <input
                type="number"
                name="batteryHealthMin"
                min="0"
                max="100"
                defaultValue={params.batteryHealthMin ?? ""}
                placeholder="Min"
              />
              <input
                type="number"
                name="batteryHealthMax"
                min="0"
                max="100"
                defaultValue={params.batteryHealthMax ?? ""}
                placeholder="Max"
              />
              <div className="battery-quick-btns">
                <button className="battery-quick-btn">90-100</button>
                <button className="battery-quick-btn">80-90</button>
                <button className="battery-quick-btn">80 or less</button>
              </div>
            </div>
          </div>

          <div className="filter-panel-actions">
            <button className="primary-button" type="submit">
              Apply Filters
            </button>
            <button className="quiet-button" type="button">
              Reset
            </button>
          </div>
        </form>

        <div className="inventory-toolbar">
          <div className="toolbar-group">
            <div className="toolbar-dropdown">
              Bulk Actions <span className="dropdown-arrow">▾</span>
            </div>
            <button className="toolbar-btn">Stock Levels</button>
            <button className="toolbar-btn active">Grouped</button>
            <button className="toolbar-btn">Individual</button>
          </div>
          <div className="toolbar-group">
            <button className="toolbar-btn">Filters</button>
            <button className="toolbar-btn">Columns</button>
            <button className="toolbar-btn download-btn">
              Download <span className="download-icon">⤓</span>
            </button>
          </div>
          <div className="toolbar-search">
            <input
              name="search"
              defaultValue={search}
              placeholder="Search"
              className="toolbar-search-input"
            />
          </div>
        </div>

        <div className="inventory-table-wrap">
          <table className="inventory-table inventory-table-full">
            <caption className="sr-only">Inventory items</caption>
            <thead>
              <tr>
                <th className="table-cell-check">
                  <input type="checkbox" aria-label="Select all" />
                </th>
                <th>PO</th>
                <th>Product</th>
                <th>ID</th>
                <th>ESN</th>
                <th>Grade</th>
                <th>Damages</th>
                <th>Status</th>
                <th>Location</th>
                <th>Sold</th>
                <th>Order</th>
                <th>Battery Health</th>
                <th>Marketplace Status</th>
                <th>Local</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((unit) => {
                const sku = unit.skuInfo;
                return (
                  <tr key={unit.id}>
                    <td className="table-cell-check">
                      <input type="checkbox" aria-label={`Select ${unit.serialNumber ?? unit.id}`} />
                    </td>
                    <td className="table-cell-po">PO #80</td>
                    <td className="table-cell-product">
                      <div className="product-main">{formatProduct(unit)}</div>
                      <div className="product-sku">{formatSkuLabel(unit)}</div>
                    </td>
                    <td className="table-cell-id">
                      {`${50 + paginated.indexOf(unit)}`}
                      {unit.id.slice(-2)}
                    </td>
                    <td className="table-cell-esn">{unit.serialNumber ?? "—"}</td>
                    <td className="table-cell-grade">{unit.grade ?? "—"}</td>
                    <td className="table-cell-damages">{unit.damageNotes ?? sku?.damages ?? "—"}</td>
                    <td className="table-cell-status">{unit.status ?? "—"}</td>
                    <td className="table-cell-location">{unit.location ?? "—"}</td>
                    <td className="table-cell-sold">$0.00</td>
                    <td className="table-cell-order">N/A</td>
                    <td className="table-cell-battery">—</td>
                    <td className="table-cell-marketplace">—</td>
                    <td className="table-cell-local">—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <nav className="inventory-pagination" aria-label="Inventory pages">
          <span>
            Showing {total ? start : 0}–{end} of {total.toLocaleString()}
          </span>
          <div>
            {page > 1 ? (
              <Link className="quiet-button" href={`/dashboard/inventory?page=${page - 1}&${queryString}`}>
                Previous
              </Link>
            ) : null}
            {page * 50 < total ? (
              <Link className="quiet-button" href={`/dashboard/inventory?page=${page + 1}&${queryString}`}>
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      </section>
    </WorkspaceShell>
  );
}
