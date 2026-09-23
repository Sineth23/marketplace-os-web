import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../components/workspace-shell";
import { listInventory, listInventoryUnits, listOrganizations } from "../../../lib/api";
import { session } from "../../../lib/auth";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; created?: string }>;
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
  return (
    <WorkspaceShell organizationName={organization.name} activeSection="inventory">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Inventory catalog</p>
          <h1>{organization.name} inventory</h1>
          <p>
            {inventory.total.toLocaleString()} catalog SKUs · {units.total.toLocaleString()} serialized units
          </p>
        </div>
        <div className="dashboard-intro-actions">
          <Link className="primary-button" href="/dashboard/inventory/new">
            Add inventory
          </Link>
          <Link className="quiet-button" href="/dashboard">
            Back to setup
          </Link>
        </div>
      </section>
      {params.created === "1" ? <p className="form-message success-banner">Inventory SKU added.</p> : null}
      <form className="inventory-search">
        <input name="search" defaultValue={search} placeholder="Search SKU, manufacturer, or model" />
        <button className="primary-button">Search</button>
      </form>
      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <caption className="sr-only">Inventory catalog records</caption>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Variant</th>
              <th>Network</th>
              <th>Capacity</th>
              <th>Color</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {inventory.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.sourceSku}</strong>
                </td>
                <td>{[item.manufacturer, item.model].filter(Boolean).join(" ") || "—"}</td>
                <td>{item.variant ?? "—"}</td>
                <td>{item.network ?? "—"}</td>
                <td>{item.capacity ?? "—"}</td>
                <td>{item.color ?? "—"}</td>
                <td>{item.grade ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="inventory-pagination" aria-label="Inventory pages">
        <span>
          Showing {inventory.items.length ? (page - 1) * 50 + 1 : 0}–{Math.min(page * 50, inventory.total)} of{" "}
          {inventory.total.toLocaleString()}
        </span>
        <div>
          {page > 1 ? (
            <Link
              className="quiet-button"
              href={`/dashboard/inventory?page=${page - 1}&search=${encodeURIComponent(search)}`}
            >
              Previous
            </Link>
          ) : null}
          {page * 50 < inventory.total ? (
            <Link
              className="quiet-button"
              href={`/dashboard/inventory?page=${page + 1}&search=${encodeURIComponent(search)}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </nav>
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Serialized inventory</p>
            <h2>Individual devices</h2>
          </div>
          <span>{units.total.toLocaleString()} units</span>
        </div>
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <caption className="sr-only">Serialized device records</caption>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Serial / ESN</th>
                <th>Grade</th>
                <th>Damage notes</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {units.items.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <strong>{unit.sku}</strong>
                  </td>
                  <td>{unit.serialNumber ?? "—"}</td>
                  <td>{unit.grade ?? "—"}</td>
                  <td>{unit.damageNotes ?? "—"}</td>
                  <td>{unit.location ?? "—"}</td>
                  <td>{unit.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}
