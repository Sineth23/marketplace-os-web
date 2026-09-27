import Link from "next/link";
import type { ReactNode } from "react";

type AmazonTab = "details" | "listings" | "opportunities";

const tabs: ReadonlyArray<{ id: AmazonTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "listings", label: "Listings" },
  { id: "opportunities", label: "Listing Opportunities" },
];

function AmazonTabLink({
  tab,
  current,
  children,
}: {
  tab: AmazonTab;
  current: AmazonTab;
  children: ReactNode;
}) {
  return (
    <Link
      className={current === tab ? "amazon-tab selected" : "amazon-tab"}
      href={"/dashboard/integrations/amazon?tab=" + tab}
      aria-current={current === tab ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function SetupStep({
  number,
  title,
  status,
  description,
}: {
  number: string;
  title: string;
  status: "complete" | "next" | "pending";
  description: ReactNode;
}) {
  const statusLabel =
    status === "complete" ? "Reported complete" : status === "next" ? "Next step" : "Pending";
  return (
    <li className={"amazon-setup-step " + status}>
      <span className="amazon-step-number" aria-hidden="true">
        {number}
      </span>
      <div className="amazon-step-copy">
        <div className="amazon-step-heading">
          <h3>{title}</h3>
          <span className={"amazon-step-status " + status}>{statusLabel}</span>
        </div>
        <p>{description}</p>
      </div>
    </li>
  );
}

function DetailsView() {
  return (
    <div className="amazon-details-grid">
      <section className="amazon-panel amazon-next-step" aria-labelledby="amazon-next-title">
        <p className="eyebrow">Your next portal step</p>
        <h2 id="amazon-next-title">Verify your identity</h2>
        <p>
          In the Solution Provider Portal, choose <strong>Get Started</strong> under{" "}
          <strong>Verify your identity</strong>. Amazon will show the identity documents accepted for your
          country.
        </p>
        <a
          className="amazon-primary-link"
          href="https://solutionproviderportal.amazon.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open Amazon Solution Provider Portal <span aria-hidden="true">↗</span>
        </a>
        <div className="amazon-document-note">
          <strong>Have these ready</strong>
          <ul>
            <li>Government-issued ID or passport</li>
            <li>A recent bank or credit card statement</li>
            <li>Business license, if applicable</li>
          </ul>
        </div>
      </section>

      <section className="amazon-panel" aria-labelledby="amazon-account-title">
        <div className="amazon-panel-heading">
          <div>
            <p className="eyebrow">Connection summary</p>
            <h2 id="amazon-account-title">Account status</h2>
          </div>
          <span className="amazon-state-pill">Not connected</span>
        </div>
        <dl className="amazon-account-facts">
          <div>
            <dt>Amazon seller</dt>
            <dd>No seller account authorized</dd>
          </div>
          <div>
            <dt>App environment</dt>
            <dd>Sandbox client created</dd>
          </div>
          <div>
            <dt>Marketplaces</dt>
            <dd>None selected</dd>
          </div>
          <div>
            <dt>Listings access</dt>
            <dd>Unavailable</dd>
          </div>
        </dl>
        <p className="amazon-inline-note">
          Sandbox credentials are not saved in Marketplace OS. This page does not check Amazon or store
          credentials.
        </p>
      </section>

      <section className="amazon-panel amazon-setup-panel" aria-labelledby="amazon-checklist-title">
        <div className="amazon-panel-heading">
          <div>
            <p className="eyebrow">Manual setup guide</p>
            <h2 id="amazon-checklist-title">Steps before a seller can connect</h2>
          </div>
          <span className="amazon-manual-badge">Based on your shared portal status</span>
        </div>
        <ol className="amazon-setup-list">
          <SetupStep
            number="1"
            title="Create the sandbox app client"
            status="complete"
            description="Your portal screenshot showed the marketplaceos sandbox client. It can support mock API experiments, not real seller listings."
          />
          <SetupStep
            number="2"
            title="Verify your identity"
            status="next"
            description="Complete the identity check in the Solution Provider Portal. Amazon lists a business license as required only if applicable."
          />
          <SetupStep
            number="3"
            title="Complete the developer profile and request roles"
            status="pending"
            description="After identity verification, complete the profile and request only the access needed for the approved listing read."
          />
          <SetupStep
            number="4"
            title="Register and review the public app"
            status="pending"
            description="Marketplace OS serves multiple organizations, so tenant access needs Amazon’s public app and Appstore review."
          />
          <SetupStep
            number="5"
            title="Build seller authorization and listing reads"
            status="pending"
            description="This requires a separately reviewed backend implementation. Seller authorization and Amazon listing data are not available here yet."
          />
        </ol>
      </section>

      <aside className="amazon-boundary-note">
        <strong>Read-only boundary</strong>
        <span>
          This screen is a setup guide only. It does not connect a seller, call Amazon APIs, import orders,
          create listings, or synchronize stock. WholeCell remains the inventory source of truth.
        </span>
      </aside>
    </div>
  );
}

function EmptyView({ kind }: { kind: "listings" | "opportunities" }) {
  const isListings = kind === "listings";
  return (
    <section className="amazon-empty-panel" aria-labelledby="amazon-empty-title">
      <span className="amazon-empty-mark" aria-hidden="true">
        A
      </span>
      <p className="eyebrow">{isListings ? "Amazon seller data" : "WholeCell comparison"}</p>
      <h2 id="amazon-empty-title">
        {isListings ? "No Amazon listings to show" : "No listing opportunities yet"}
      </h2>
      <p>
        {isListings
          ? "No seller account is connected, so Marketplace OS has no Amazon listing data to display. Sandbox sample data is not shown as a real account."
          : "Marketplace OS has not compared WholeCell inventory with Amazon listings. Opportunities will appear only after an approved seller connection and a supported read are implemented."}
      </p>
      <span className="amazon-empty-status">No live or sample data</span>
    </section>
  );
}

export function AmazonIntegration({ tab }: { tab: string | undefined }) {
  const current: AmazonTab = tab === "listings" || tab === "opportunities" ? tab : "details";

  return (
    <div className="amazon-page">
      <Link className="amazon-back-link" href="/dashboard/integrations">
        ← All integrations
      </Link>
      <section className="amazon-page-intro" aria-labelledby="amazon-title">
        <div className="amazon-account-identity">
          <span className="amazon-mark" aria-hidden="true">
            a
          </span>
          <div>
            <p className="eyebrow">Marketplace connection</p>
            <h1 id="amazon-title">Amazon</h1>
            <span>Selling Partner API · setup guide</span>
          </div>
        </div>
        <span className="amazon-status-pill">Setup in progress</span>
      </section>

      <section className="amazon-summary" aria-label="Amazon integration status">
        <div>
          <span>Connection</span>
          <strong>Not connected</strong>
        </div>
        <div>
          <span>Developer app</span>
          <strong>Sandbox client created</strong>
        </div>
        <div>
          <span>Seller listings</span>
          <strong>Unavailable</strong>
        </div>
        <p>
          Manual status based on the portal details you shared. This page is not connected to Amazon and does
          not verify approval changes automatically.
        </p>
      </section>

      <nav className="amazon-tabs" aria-label="Amazon integration views">
        {tabs.map((item) => (
          <AmazonTabLink key={item.id} tab={item.id} current={current}>
            {item.label}
          </AmazonTabLink>
        ))}
      </nav>

      {current === "details" ? <DetailsView /> : <EmptyView kind={current} />}
    </div>
  );
}
