import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type PartnerMarketplace = "bestbuy" | "reebelo";
type PartnerTab = "details" | "listings" | "opportunities";

const marketplaceCopy = {
  bestbuy: {
    name: "Best Buy Marketplace",
    mark: "B",
    logoSrc: "/integrations/best-buy-logo.jpg",
    logoWidth: 64,
    logoHeight: 44,
    accessLabel: "Marketplace partner access",
    nextStep: "Confirm seller and API access with Best Buy",
    description:
      "Marketplace OS has no Best Buy partner approval or seller API contract on file. Confirm that your seller account can use the marketplace integration and which listing reads are available.",
    checklist: [
      "Confirm your seller account is approved for Best Buy Marketplace.",
      "Ask Best Buy for the current partner integration guide, authentication method, and sandbox or test process.",
      "Confirm which listing and inventory reads are permitted before planning a connection.",
    ],
    directoryDescription:
      "A partner-access checklist for Best Buy Marketplace. No seller connection or listing data is available.",
  },
  reebelo: {
    name: "Reebelo",
    mark: "R",
    logoSrc: "/integrations/reebelo-logo.svg",
    logoWidth: 134,
    logoHeight: 29,
    accessLabel: "Merchant partner access",
    nextStep: "Request Reebelo merchant integration details",
    description:
      "Marketplace OS has no Reebelo merchant integration documentation or seller API contract on file. Request the current partner materials and confirm available listing reads and authentication.",
    checklist: [
      "Confirm your Reebelo merchant account and integration eligibility.",
      "Request current API or partner documentation, authentication details, and any test environment access.",
      "Confirm which listing and inventory reads are permitted before planning a connection.",
    ],
    directoryDescription:
      "A merchant-access checklist for Reebelo. No seller connection or listing data is available.",
  },
} as const;

const tabs: ReadonlyArray<{ id: PartnerTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "listings", label: "Listings" },
  { id: "opportunities", label: "Listing Opportunities" },
];

function TabLink({
  marketplace,
  tab,
  current,
  children,
}: {
  marketplace: PartnerMarketplace;
  tab: PartnerTab;
  current: PartnerTab;
  children: ReactNode;
}) {
  return (
    <Link
      className={current === tab ? "partner-guide-tab selected" : "partner-guide-tab"}
      href={`/dashboard/integrations/${marketplace}?tab=${tab}`}
      aria-current={current === tab ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function DetailsView({ marketplace }: { marketplace: PartnerMarketplace }) {
  const copy = marketplaceCopy[marketplace];
  return (
    <div className="partner-guide-details">
      <section className="partner-guide-panel partner-guide-next-step">
        <p className="eyebrow">Recommended next step</p>
        <h2>{copy.nextStep}</h2>
        <p>{copy.description}</p>
      </section>
      <section className="partner-guide-panel">
        <p className="eyebrow">Connection summary</p>
        <h2>Account status</h2>
        <dl className="partner-guide-facts">
          <div>
            <dt>{copy.accessLabel}</dt>
            <dd>Not verified</dd>
          </div>
          <div>
            <dt>Marketplace OS connection</dt>
            <dd>Not connected</dd>
          </div>
          <div>
            <dt>Seller listings</dt>
            <dd>Unavailable</dd>
          </div>
          <div>
            <dt>Provider documentation</dt>
            <dd>Not on file</dd>
          </div>
        </dl>
        <p className="partner-guide-note">
          These are Marketplace OS documentation findings, not a live check of your provider account.
        </p>
      </section>
      <section className="partner-guide-panel partner-guide-checklist">
        <p className="eyebrow">Manual partner setup guide</p>
        <h2>Information needed before implementation</h2>
        <ol>
          {copy.checklist.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <aside className="partner-guide-boundary">
        <strong>Guide only</strong>
        <span>
          This screen does not contact {copy.name}, connect an account, show sample listings, create or
          publish listings, import orders, or synchronize stock. WholeCell remains the inventory source of
          truth.
        </span>
      </aside>
    </div>
  );
}

function EmptyView({
  marketplace,
  kind,
}: {
  marketplace: PartnerMarketplace;
  kind: "listings" | "opportunities";
}) {
  const copy = marketplaceCopy[marketplace];
  const isListings = kind === "listings";
  return (
    <section className="partner-guide-empty" aria-labelledby="partner-guide-empty-title">
      <span className={"partner-guide-empty-mark " + marketplace} aria-hidden="true">
        <Image
          src={copy.logoSrc}
          alt=""
          width={copy.logoWidth}
          height={copy.logoHeight}
          className="partner-platform-logo"
        />
      </span>
      <p className="eyebrow">{isListings ? "Seller listing data" : "WholeCell comparison"}</p>
      <h2 id="partner-guide-empty-title">
        {isListings ? `No ${copy.name} listings to show` : "No listing opportunities to show"}
      </h2>
      <p>
        {isListings
          ? `No ${copy.name} account is connected, so Marketplace OS has no seller listing data to display.`
          : `Marketplace OS has not compared WholeCell inventory with ${copy.name} listings. A supported, authorized read is required first.`}
      </p>
      <span className="partner-guide-data-label">No live or sample data</span>
    </section>
  );
}

export function MarketplacePartnerGuide({
  marketplace,
  tab,
}: {
  marketplace: PartnerMarketplace;
  tab: string | undefined;
}) {
  const copy = marketplaceCopy[marketplace];
  const current: PartnerTab = tab === "listings" || tab === "opportunities" ? tab : "details";

  return (
    <div className="partner-guide-page">
      <Link className="partner-guide-back" href="/dashboard/integrations">
        ← All integrations
      </Link>
      <section className="partner-guide-intro" aria-labelledby="partner-guide-title">
        <div className="partner-guide-identity">
          <span className={"partner-guide-brand " + marketplace} aria-hidden="true">
            <Image
              src={copy.logoSrc}
              alt=""
              width={copy.logoWidth}
              height={copy.logoHeight}
              className="partner-platform-logo"
            />
          </span>
          <div>
            <p className="eyebrow">Marketplace partner guide</p>
            <h1 id="partner-guide-title">{copy.name}</h1>
            <small>Manual setup guide · preview only</small>
          </div>
        </div>
        <span className="partner-guide-status">Access unverified</span>
      </section>

      <section className="partner-guide-summary" aria-label={`${copy.name} integration status`}>
        <div>
          <span>Connection</span>
          <strong>Not connected</strong>
        </div>
        <div>
          <span>Partner access</span>
          <strong>Unverified</strong>
        </div>
        <div>
          <span>Listing data</span>
          <strong>Unavailable</strong>
        </div>
        <p>Static setup information only. Marketplace OS has not checked your provider account.</p>
      </section>

      <nav className="partner-guide-tabs" aria-label={`${copy.name} integration views`}>
        {tabs.map((item) => (
          <TabLink key={item.id} marketplace={marketplace} tab={item.id} current={current}>
            {item.label}
          </TabLink>
        ))}
      </nav>

      {current === "details" ? (
        <DetailsView marketplace={marketplace} />
      ) : (
        <EmptyView marketplace={marketplace} kind={current} />
      )}
    </div>
  );
}
