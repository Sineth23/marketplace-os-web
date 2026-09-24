import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { redirect } from "next/navigation";

import { ProductCatalogTable } from "../../../components/product-catalog-table";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { listOrganizations } from "../../../lib/api";
import { parseProductCatalogCsv } from "../../../lib/product-catalog-csv";
import { session } from "../../../lib/auth";

export default async function ProductCatalogPage() {
  if (!(await session())) redirect("/");

  const organizations = await listOrganizations();
  const deviceMart = organizations.find(
    (organization) => organization.name.trim().toLowerCase() === "device mart",
  );
  const organization = deviceMart ?? organizations[0];
  if (!organization) redirect("/dashboard");

  const variations = deviceMart
    ? parseProductCatalogCsv(
        await readFile(join(process.cwd(), "data/wholecell-device-mart-product-variations.csv"), "utf8"),
      )
    : [];

  return (
    <WorkspaceShell organizationName={organization.name} activeSection="product-catalog">
      <ProductCatalogTable initialVariations={variations} canViewSnapshot={Boolean(deviceMart)} />
    </WorkspaceShell>
  );
}
