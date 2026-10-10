import Image from "next/image";
import Link from "next/link";

import type { GoogleDriveConnectionStatus } from "../lib/api";

type IntegrationCardProps = Readonly<{
  name: string;
  description: string;
  status: string;
  href: string;
  action: string;
  icon: string;
  logo?: Readonly<{ src: string; width: number; height: number }>;
  preview?: boolean;
}>;

function IntegrationCard({
  name,
  description,
  status,
  href,
  action,
  icon,
  logo,
  preview = false,
}: IntegrationCardProps) {
  return (
    <article className="integration-directory-card">
      <div className="integration-directory-card-heading">
        <span
          className={"integration-directory-icon " + (preview ? "preview " : "") + (logo ? "has-logo" : "")}
          aria-hidden="true"
        >
          {logo ? (
            <Image className="platform-logo" src={logo.src} alt="" width={logo.width} height={logo.height} />
          ) : (
            icon
          )}
        </span>
        <span className={`integration-directory-status ${preview ? "preview" : ""}`}>{status}</span>
      </div>
      <div>
        <p className="eyebrow">{preview ? "Marketplace preview" : "Workspace integration"}</p>
        <h2>{name}</h2>
        <p>{description}</p>
      </div>
      <Link className="integration-directory-link" href={href}>
        {action}
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function IntegrationDirectory({
  organizationId,
  organizationName,
  driveStatus,
}: {
  organizationId: string;
  organizationName: string;
  driveStatus: GoogleDriveConnectionStatus | null;
}) {
  const driveLabel = driveStatus
    ? driveStatus.disconnectPending
      ? "Disconnect pending"
      : driveStatus.connected
        ? "Connected"
        : "Not connected"
    : "Status unavailable";
  const driveDescription = driveStatus
    ? driveStatus.connected
      ? driveStatus.providerAccountEmail
        ? `Connected as ${driveStatus.providerAccountEmail}. Manage the photo source for ${organizationName}.`
        : `The Google Drive connection is active for ${organizationName}. Manage its photo source.`
      : "Connect Google Drive to select and review product photos for this workspace."
    : "Google Drive status could not be loaded. Open the existing workflow to retry or inspect the connection.";

  return (
    <div className="integration-directory">
      <section className="dashboard-intro" aria-labelledby="integrations-title">
        <div>
          <p className="eyebrow">Workspace tools</p>
          <h1 id="integrations-title">Integrations</h1>
          <p>Manage connected services and review marketplace integrations available to this workspace.</p>
        </div>
      </section>

      <section className="integration-directory-section" aria-labelledby="available-integrations-title">
        <div className="integration-directory-section-heading">
          <div>
            <p className="eyebrow">Connections and workflows</p>
            <h2 id="available-integrations-title">Your integrations</h2>
          </div>
          <span>{organizationName}</span>
        </div>

        <div className="integration-directory-grid">
          <IntegrationCard
            name="Google Drive"
            description={driveDescription}
            status={driveLabel}
            href={`/dashboard/google-drive?organizationId=${encodeURIComponent(organizationId)}`}
            action={driveStatus?.connected ? "Manage Google Drive" : "Open Google Drive"}
            icon="G"
          />
          <IntegrationCard
            name="WholeCell inventory"
            description="Import and review WholeCell inventory CSVs. WholeCell remains the source of truth; this is not a direct WholeCell API connection."
            status="CSV workflow"
            href="/dashboard/inventory"
            action="Open inventory"
            icon="W"
          />
          <IntegrationCard
            name="eBay"
            description="Review the WholeCell-inspired account, listing, and opportunity screens. No eBay account is connected and no marketplace data is shown."
            status="UI preview only"
            href="/dashboard/integrations/ebay"
            action="View eBay preview"
            icon="e"
          />
          <IntegrationCard
            name="Amazon"
            description="Review the Solution Provider Portal setup steps and see what remains before Amazon sellers can connect."
            status="Setup guide only"
            href="/dashboard/integrations/amazon"
            action="View Amazon setup"
            icon="a"
            preview
          />
          <IntegrationCard
            name="Best Buy Marketplace"
            description="Connect your Best Buy Mirakl API key to view your Marketplace offers. Read-only; nothing is published or changed."
            status="Read-only connection"
            href="/dashboard/integrations/bestbuy"
            action="Open Best Buy"
            icon="B"
            logo={{ src: "/integrations/best-buy-logo.jpg", width: 64, height: 44 }}
          />
          <IntegrationCard
            name="Reebelo"
            description="Review the merchant-access checklist. No seller connection or listing data is available."
            status="Partner access unverified"
            href="/dashboard/integrations/reebelo"
            action="View Reebelo guide"
            icon="R"
            logo={{ src: "/integrations/reebelo-logo.svg", width: 134, height: 29 }}
            preview
          />
        </div>
        <p className="integration-directory-note">
          Amazon and Reebelo are manual guides only. These pages do not connect to a provider or show seller
          data.
        </p>
      </section>
    </div>
  );
}
