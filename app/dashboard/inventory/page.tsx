import Link from "next/link";
import { redirect } from "next/navigation";

import { WorkspaceShell } from "../../../components/workspace-shell";
import { listInventory, listOrganizations } from "../../../lib/api";
import { session } from "../../../lib/auth";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  if (!(await session())) redirect("/");
  const organization = (await listOrganizations())[0];
  if (!organization) redirect("/dashboard");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? "";
  const inventory = await listInventory(organization.id, page, search);
  return (
    <WorkspaceShell organizationName={organization.name}>
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Inventory catalog</p>
          <h1>{organization.name} inventory</h1>
          <p>{inventory.total.toLocaleString()} unique SKUs available for photo matching.</p>
        </div>
        <Link className="quiet-button" href="/dashboard">
          Back to setup
        </Link>
      </section>
      <form className="inventory-search">
        <input name="search" defaultValue={search} placeholder="Search SKU, manufacturer, or model" />
        <button className="primary-button">Search</button>
      </form>
      <div className="inventory-table-wrap">
        <table className="inventory-table">
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
    </WorkspaceShell>
  );
}
