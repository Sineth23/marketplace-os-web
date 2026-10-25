import { ListingComparisonView } from "../../../../components/listing-comparison-view";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import {
  fixtureListingProviders,
  fixtureMapping,
  fixtureTenantQuantities,
  withFixtureMappings,
} from "../../../../lib/listing-fixtures";

/**
 * A preview of the marketplace listing view, rendered with fixture data.
 *
 * The view normally reads the connected marketplaces, which needs a running
 * backend and tenant connections. This renders the same layouts against
 * representative data so the screen can be reviewed on its own. The fixture
 * data is not a tenant's data, and nothing here can be written to.
 */
export default async function ListingsPreviewPage() {
  const providers = withFixtureMappings(fixtureListingProviders, fixtureMapping);
  return (
    <WorkspaceShell organizationName="Example Reseller" activeSection="listings">
      <section className="dashboard-intro" aria-labelledby="listing-preview-title">
        <div>
          <p className="eyebrow">Layout preview</p>
          <h1 id="listing-preview-title">Marketplace listings</h1>
          <p>
            Rendered with fixture data so the layout can be reviewed without the backend. The data is
            representative, not a tenant&apos;s, and nothing here can be written to.
          </p>
        </div>
      </section>
      <ListingComparisonView
        providers={providers}
        tenantQuantityByCatalogSku={fixtureTenantQuantities}
        search=""
        providerFilter=""
        stateFilter=""
        comparisonFilter=""
      />
    </WorkspaceShell>
  );
}
