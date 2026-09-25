import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

const operations = [
  { label: "Purchase Orders", icon: "box" },
  { label: "Process Batches", icon: "link" },
  { label: "Inventory Reports", icon: "overview" },
  { label: "Pricing", icon: "overview" },
  { label: "Offers", icon: "box" },
  { label: "Organizations", icon: "link" },
  { label: "Sales Orders", icon: "box" },
  { label: "Fulfillment", icon: "link" },
  { label: "Invoices", icon: "overview" },
  { label: "RMAs", icon: "box" },
  { label: "Product Catalog", icon: "box", href: "/dashboard/product-catalog" },
  { label: "Integrations", icon: "link", href: "/dashboard/integrations" },
  { label: "Settings", icon: "overview" },
  { label: "Users", icon: "link" },
  { label: "Scan Reports", icon: "overview", href: "/dashboard/scan-reports" },
] as const;

const workflow = [
  { label: "Drive photo search", icon: "photos" },
  { label: "Photo grouping", icon: "check" },
] as const;

export function WorkspaceShell({
  children,
  organizationName,
  activeSection = "overview",
}: {
  children: ReactNode;
  organizationName?: string | undefined;
  activeSection?: "overview" | "inventory" | "scan-reports" | "product-catalog" | "integrations";
}) {
  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Marketplace OS home">
          <span className="brand-mark" aria-hidden="true">
            m<span>.</span>
          </span>
          <span>
            marketplace<span className="brand-suffix">OS</span>
          </span>
        </Link>
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
                className={`nav-item ${
                  (item.href === "/dashboard/scan-reports" && activeSection === "scan-reports") ||
                  (item.href === "/dashboard/product-catalog" && activeSection === "product-catalog") ||
                  (item.href === "/dashboard/integrations" && activeSection === "integrations")
                    ? "active"
                    : ""
                }`}
                key={item.label}
                href={item.href}
                aria-current={
                  (item.href === "/dashboard/scan-reports" && activeSection === "scan-reports") ||
                  (item.href === "/dashboard/product-catalog" && activeSection === "product-catalog") ||
                  (item.href === "/dashboard/integrations" && activeSection === "integrations")
                    ? "page"
                    : undefined
                }
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
