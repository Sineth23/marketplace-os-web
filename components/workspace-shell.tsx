import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

const operations = [
  { label: "Purchase Orders", icon: "box", href: "/dashboard/purchase-orders" },
  { label: "Process Batches", icon: "link", href: "/dashboard/process-batches" },
  { label: "Inventory Reports", icon: "overview" },
  { label: "Pricing", icon: "overview", href: "/dashboard/pricing" },
  { label: "Stock Levels", icon: "overview", href: "/dashboard/stock-levels" },
  { label: "Offers", icon: "box" },
  { label: "Organizations", icon: "link", href: "/dashboard/organizations" },
  { label: "Sales Orders", icon: "box", href: "/dashboard/sales-orders" },
  { label: "Fulfillment", icon: "link" },
  { label: "Invoices", icon: "overview" },
  { label: "RMAs", icon: "box" },
  { label: "Product Catalog", icon: "box", href: "/dashboard/product-catalog" },
  { label: "Product Variations", icon: "box", href: "/dashboard/product-variations" },
  { label: "Integrations", icon: "link", href: "/dashboard/integrations" },
  { label: "Settings", icon: "overview" },
  { label: "Users", icon: "link" },
  { label: "Scan Reports", icon: "overview", href: "/dashboard/scan-reports" },
] as const;

const workflow = [
  { label: "Drive photo search", icon: "photos" },
  { label: "Photo grouping", icon: "check" },
] as const;

/** The path each workspace section lives at, so the active item can be marked. */
const sectionPaths = {
  overview: "/dashboard",
  inventory: "/dashboard/inventory",
  pricing: "/dashboard/pricing",
  "scan-reports": "/dashboard/scan-reports",
  "product-catalog": "/dashboard/product-catalog",
  integrations: "/dashboard/integrations",
  "process-batches": "/dashboard/process-batches",
  "purchase-orders": "/dashboard/purchase-orders",
  "sales-orders": "/dashboard/sales-orders",
  "stock-levels": "/dashboard/stock-levels",
  organizations: "/dashboard/organizations",
  "product-variations": "/dashboard/product-variations",
} as const;

export type WorkspaceSection = keyof typeof sectionPaths;

export function WorkspaceShell({
  children,
  organizationName,
  activeSection = "overview",
}: {
  children: ReactNode;
  organizationName?: string | undefined;
  activeSection?: WorkspaceSection;
}) {
  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Image
            className="autodoc-logo"
            src="/brand/autodoc-logo.svg"
            alt="AutoDoc"
            width={758}
            height={122}
            priority
          />
        </div>
        <div className="workspace-identity">
          <span className="workspace-avatar" aria-hidden="true">
            <Icon name="box" />
          </span>
          <div>
            <strong>{organizationName ?? "Your workspace"}</strong>
            <span>{organizationName ? "Organization workspace" : "Preview edition"}</span>
          </div>
          <span className="identity-dot" aria-hidden="true" />
        </div>
        <nav aria-label="Main navigation">
          <p className="eyebrow nav-label">Workspace</p>
          <Link
            className={`nav-item ${activeSection === "overview" ? "active" : ""}`}
            href="/dashboard"
            aria-current={activeSection === "overview" ? "page" : undefined}
          >
            <Icon name="overview" />
            Overview
          </Link>
          <Link
            className={`nav-item ${activeSection === "inventory" ? "active" : ""}`}
            href="/dashboard/inventory"
            aria-current={activeSection === "inventory" ? "page" : undefined}
          >
            <Icon name="box" />
            Inventory
          </Link>
          <p className="eyebrow nav-label nav-label-secondary">Operations</p>
          {operations.map((item) =>
            "href" in item ? (
              <Link
                className={`nav-item ${item.href === sectionPaths[activeSection] ? "active" : ""}`}
                key={item.label}
                href={item.href}
                aria-current={item.href === sectionPaths[activeSection] ? "page" : undefined}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ) : (
              <span className="nav-item unavailable" key={item.label} aria-disabled="true">
                <Icon name={item.icon} />
                {item.label}
                <span className="soon">Soon</span>
              </span>
            ),
          )}
          <p className="eyebrow nav-label nav-label-secondary">Workflow</p>
          {workflow.map((item) => (
            <span className="nav-item unavailable" key={item.label} aria-disabled="true">
              <Icon name={item.icon} />
              {item.label}
              <span className="soon">Paused</span>
            </span>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span className="small-spark" aria-hidden="true">
              ✳
            </span>
            <strong>Built for a second life.</strong>
            <p>
              A little less busywork.
              <br />A lot more possibility.
            </p>
          </div>
          <span className="sidebar-caption">A workspace for resellers</span>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb-divider">/</span>{" "}
            <strong>{organizationName ?? "Overview"}</strong>
          </span>
          <span className="preview-label">
            <span aria-hidden="true" />
            Workspace preview
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>Marketplace OS</span>
          <span>Good products deserve another chapter.</span>
        </footer>
      </div>
    </div>
  );
}
